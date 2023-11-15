import { existsSync } from "fs"
import { basename } from "path"
import * as vscode from "vscode"
import { Commit, CommitInfo } from "./Commit"
import {
  CommitContext,
  FileContext,
  RepositoryContext,
  TerminalContext,
} from "./context"
import {
  SelectableQuickPickButton,
  SelectableQuickPickItem,
  showSelectableQuickPick,
} from "./quickPick"
import RemoteProvider from "./RemoteProvider"
import Repository from "./Repository"
import RepositoryStore from "./RepositoryStore"
import TerminalFolderStore from "./TerminalFolderStore"
import {
  commitFilenames,
  excludeNulls,
  runCommandInTerminal,
  runGitCommand,
  userGitCommand,
} from "./util"

interface TerminalOptions extends vscode.TerminalOptions {
  context?: TerminalContext
}

interface CommitTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & CommitContext & Partial<TerminalContext>
}

interface FileTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & FileContext & Partial<TerminalContext>
}

export function commitLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
) {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<CommitTerminalLink[]> {
      const provideCommitLinks = vscode.workspace
        .getConfiguration("gitterm.terminalLinks")
        .get("provideCommitLinks")

      if (provideCommitLinks === "never") {
        return []
      }

      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const { context } = terminal.creationOptions as TerminalOptions
      const lineMatches = Array.from(line.matchAll(/([0-9a-f]{7,40})/g))

      return excludeNulls(
        await Promise.all(
          lineMatches.map(async ([match, rawCommit]) => {
            const commit = await Commit(rawCommit, repository.directory)

            if (commit === null) {
              return null
            } else {
              const matchStart = line.indexOf(match)
              const startIndex = matchStart + match.indexOf(rawCommit)

              return {
                startIndex,
                length: rawCommit.length,
                tooltip: "Pick a commit action",
                context: { ...context, repository, commit },
              }
            }
          }),
        ),
      )
    },

    async handleTerminalLink({ context }: CommitTerminalLink) {
      const { repository, commit } = context
      const commitFilenamesPromise =
        "commitFilenames" in context ? context.commitFilenames : undefined

      const [commitFilenames, commitInfo, remotes] = await Promise.all([
        commitFilenamesPromise,
        CommitInfo(commit.full, repository.directory),
        commitRemotes(commit, repository),
      ])

      const commitFilename = commitFilenames?.get(commit.full) ?? null
      const { authorDate, authorName, subject } = commitInfo

      const commitItems: SelectableQuickPickItem[] = excludeNulls([
        {
          label: commit.abbreviated,
          kind: vscode.QuickPickItemKind.Separator,
        },
        {
          label: subject,
          detail: `${authorName} • ${authorDate.toLocaleString()}`,
          onSelected: () => {
            runCommandInTerminal({
              name: commit.abbreviated,
              icon: "git-commit",
              cwd: repository.directory,
              command: userGitCommand({
                key: "showCommit",
                variables: { commit: commit.full },
              }),
              context: { commit },
            })
          },
        },
        {
          label: "$(clippy) Copy Commit ID",
          onSelected: () => {
            vscode.env.clipboard.writeText(commit.full)
          },
        },
        {
          label: "$(history) History from Commit",
          onSelected: () => {
            runCommandInTerminal({
              name: commit.abbreviated,
              icon: "history",
              cwd: repository.directory,
              command: userGitCommand({
                key: "commitHistory",
                variables: { commit: commit.full },
              }),
              context: { commit },
            })
          },
        },
        pickRemote(
          remotes,
          { label: "$(link-external) Open Commit on Remote" },
          (remote) => remote.commitUrl(commit),
        ),
      ])

      const fileCommitItems: SelectableQuickPickItem[] =
        commitFilename !== null
          ? fileAtCommitItems(repository, remotes, commit, commitFilename)
          : []

      showSelectableQuickPick({
        placeholder: "Select an action",
        items: [...commitItems, ...fileCommitItems],
      })
    },
  })
}

export function fileLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
) {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<FileTerminalLink[]> {
      const provideFileLinks = vscode.workspace
        .getConfiguration("gitterm.terminalLinks")
        .get("provideFileLinks")

      if (provideFileLinks === "never") {
        return []
      }

      const { context } = terminal.creationOptions as TerminalOptions
      const commit = context && "commit" in context ? context.commit : undefined

      if (commit === undefined && provideFileLinks === "withCommitContext") {
        return []
      }

      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      return repository.filenames
        .findMatches(line)
        .map(({ startIndex, text: filename }) => ({
          startIndex,
          length: filename.length,
          tooltip: "Pick a file action",
          context: { ...context, repository, filename },
        }))
    },

    async handleTerminalLink({ context }: FileTerminalLink) {
      const { repository, filename } = context
      const commit = "commit" in context ? context.commit : undefined

      const uri = vscode.Uri.joinPath(repository.directory, filename)
      const exists = existsSync(uri.fsPath)
      const fileLabel = basename(filename)

      const openItem: SelectableQuickPickItem | null = exists
        ? {
            label: "$(go-to-file) Open File",
            onSelected: async () => {
              await vscode.window.showTextDocument(uri)
            },
          }
        : null

      const fileItems: SelectableQuickPickItem[] = excludeNulls([
        {
          label: fileLabel,
          kind: vscode.QuickPickItemKind.Separator,
        },
        openItem,
        {
          label: "$(clippy) Copy File Path",
          onSelected: () => {
            vscode.env.clipboard.writeText(filename)
          },
        },
        {
          label: "$(history) File History",
          onSelected: () => {
            runCommandInTerminal({
              name: fileLabel,
              icon: "history",
              cwd: repository.directory,
              command: userGitCommand({
                key: "fileHistory",
                variables: { commit: "HEAD", filename },
              }),
              context: {
                commit,
                filename,
                commitFilenames: commitFilenames(
                  filename,
                  repository.directory,
                ),
              },
            })
          },
        },
      ])

      let fileCommitItems: SelectableQuickPickItem[] = []

      if (commit !== undefined) {
        const remotes = await commitRemotes(commit, repository)

        fileCommitItems = fileAtCommitItems(
          repository,
          remotes,
          commit,
          filename,
        )
      }

      showSelectableQuickPick({
        placeholder: "Select an action",
        items: [...fileItems, ...fileCommitItems],
      })
    },
  })
}

async function commitRemotes(
  commit: Commit,
  repository: Repository,
): Promise<RemoteProvider[]> {
  const remoteProviders = repository.remoteProviders.sorted()

  if (remoteProviders.length === 0) {
    return []
  }

  // The performance of checking whether every remote branch contains a commit
  // becomes noticeably slow in repositories with long history and many remote
  // branches
  const args = ["-r", "--contains", commit.full]
  const output = await runGitCommand("branch", repository.directory, args)
  const branches = output.split("\n").map((b) => b.trim())

  return remoteProviders.filter(({ remote }) => {
    const match = branches.find((b) => b.startsWith(remote.name))
    return match !== undefined
  })
}

function fileAtCommitItems(
  repository: Repository,
  remotes: RemoteProvider[],
  commit: Commit,
  filename: string,
) {
  const fileLabel = `${basename(filename)} @ ${commit.abbreviated}`
  const variables = { commit: commit.full, filename }

  const getContext = () => ({
    commit,
    filename,
    commitFilenames: commitFilenames(filename, repository.directory),
  })

  return excludeNulls([
    {
      label: fileLabel,
      kind: vscode.QuickPickItemKind.Separator,
    },
    {
      label: "$(file) Show File",
      onSelected: () => {
        runCommandInTerminal({
          name: fileLabel,
          icon: "file",
          cwd: repository.directory,
          command: userGitCommand({
            key: "showFileContentsAtCommit",
            variables,
          }),
          context: getContext(),
        })
      },
    },
    {
      label: "$(git-compare) Show Diff",
      onSelected: () => {
        runCommandInTerminal({
          name: fileLabel,
          icon: "git-compare",
          cwd: repository.directory,
          command: userGitCommand({
            key: "showFileDiffAtCommit",
            variables,
          }),
          context: getContext(),
        })
      },
    },
    {
      label: "$(history) File History from Commit",
      onSelected: () => {
        runCommandInTerminal({
          name: fileLabel,
          icon: "history",
          cwd: repository.directory,
          command: userGitCommand({
            key: "fileHistory",
            variables,
          }),
          context: getContext(),
        })
      },
    },
    pickRemote(
      remotes,
      { label: "$(link-external) Open File on Remote" },
      (remote) => remote.fileAtCommitUrl(commit, filename),
    ),
  ])
}

function pickRemote(
  remotes: RemoteProvider[],
  item: vscode.QuickPickItem,
  getRemoteUrl: (remote: RemoteProvider) => vscode.Uri | null,
): SelectableQuickPickItem | null {
  const openRemoteUrl = (remote: RemoteProvider) => {
    const url = getRemoteUrl(remote)

    if (url !== null) {
      vscode.env.openExternal(url)
    }
  }

  const copyUrlButton = (
    remote: RemoteProvider,
  ): SelectableQuickPickButton => ({
    tooltip: "Copy Remote URL",
    iconPath: new vscode.ThemeIcon("clippy"),
    onSelected: () => {
      const url = getRemoteUrl(remote)

      if (url !== null) {
        vscode.env.clipboard.writeText(url.toString())
        vscode.window.showInformationMessage("Remote URL copied to clipboard")
      }
    },
  })

  if (remotes.length === 0) {
    return null
  } else if (remotes.length === 1) {
    return {
      ...item,
      onSelected: () => openRemoteUrl(remotes[0]),
      buttons: [copyUrlButton(remotes[0])],
    }
  } else {
    return {
      ...item,
      label: `${item.label}...`,
      onSelected: () => {
        showSelectableQuickPick({
          placeholder: "Select a remote",
          items: remotes.map((remote) => ({
            label: `$(globe) ${remote.label}`,
            onSelected: () => openRemoteUrl(remote),
            buttons: [copyUrlButton(remote)],
          })),
        })
      },
    }
  }
}
