import { basename } from "path"
import * as vscode from "vscode"
import { TerminalFileContext } from "./commands"
import { Commit } from "./Commit"
import {
  CommitContext,
  FileContext,
  RawCommitContext,
  RepositoryContext,
} from "./context"
import RemoteProvider from "./RemoteProvider"
import Repository from "./Repository"
import RepositoryStore from "./RepositoryStore"
import TerminalFolderStore from "./TerminalFolderStore"
import {
  excludeNulls,
  gitCommand,
  runCommand,
  runCommandInTerminal,
} from "./util"

type QuickPickItem = vscode.QuickPickItem & { onSelected?: () => void }

interface CommitTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & CommitContext & Partial<TerminalFileContext>
}

interface FileTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & FileContext & Partial<CommitContext>
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
      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const options = terminal.creationOptions
      const context = "context" in options ? (options.context as object) : {}
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
      const { repository, commit, filename, commitFilenames } = context

      const options = { placeHolder: "Select an action" }

      const remoteProviders = await commitRemoteProviders(commit, repository)
      const commitFilename =
        filename !== undefined && commitFilenames !== undefined
          ? (await commitFilenames)?.get(commit.full) ?? null
          : null

      const commitItems: QuickPickItem[] = excludeNulls([
        {
          label: commit.abbreviated,
          kind: vscode.QuickPickItemKind.Separator,
        },
        {
          label: "$(git-commit) Show Commit",
          onSelected: () => {
            const commandVars: RawCommitContext = { commit: commit.full }
            const terminalContext: CommitContext = { commit }

            runCommandInTerminal({
              name: commit.abbreviated,
              icon: "git-commit",
              cwd: repository.directory,
              command: gitCommand("showCommit", commandVars),
              context: terminalContext,
            })
          },
        },
        {
          label: "$(files) Copy Commit ID",
          onSelected: () => {
            vscode.env.clipboard.writeText(commit.full)
          },
        },
        pickRemote(
          remoteProviders,
          { label: "$(link-external) Open on Remote" },
          (remote) => {
            const url = remote.commitUrl(commit)
            vscode.env.openExternal(url)
          },
        ),
      ])

      let selectedItem

      if (commitFilename === null) {
        selectedItem = await vscode.window.showQuickPick(commitItems, options)
      } else {
        const fileLabel = `${basename(commitFilename)} @ ${commit.abbreviated}`
        const commandVars: RawCommitContext & FileContext = {
          commit: commit.full,
          filename: commitFilename,
        }
        const terminalContext: CommitContext & FileContext = {
          commit,
          filename: commitFilename,
        }

        const fileItems: QuickPickItem[] = excludeNulls([
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
                context: terminalContext,
                command: gitCommand("showFileContentsAtCommit", commandVars),
              })
            },
          },
          {
            label: "$(git-compare) Diff File",
            onSelected: () => {
              runCommandInTerminal({
                name: fileLabel,
                icon: "git-compare",
                cwd: repository.directory,
                context: terminalContext,
                command: gitCommand("showFileDiffAtCommit", commandVars),
              })
            },
          },
          pickRemote(
            remoteProviders,
            { label: "$(link-external) Open on Remote" },
            (remote) => {
              const url = remote.fileAtCommitUrl(commit, commitFilename)
              vscode.env.openExternal(url)
            },
          ),
        ])

        const items = [...commitItems, ...fileItems]
        selectedItem = await vscode.window.showQuickPick(items, options)
      }

      selectedItem?.onSelected?.()
    },
  })
}

async function commitRemoteProviders(
  commit: Commit,
  repository: Repository,
): Promise<RemoteProvider[]> {
  if (repository.remoteProviders.length === 0) {
    return []
  }

  const args = ["branch", "-r", "--contains", commit.full]
  const output = await runCommand("git", args, repository.directory)
  const branches = output.split("\n").map((b) => b.trim())

  return repository.remoteProviders.filter(({ remote }) => {
    const match = branches.find((b) => b.startsWith(remote.name))
    return match !== undefined
  })
}

function pickRemote(
  remotes: RemoteProvider[],
  item: vscode.QuickPickItem,
  onRemoteSelected: (remote: RemoteProvider) => void,
): QuickPickItem | null {
  if (remotes.length === 0) {
    return null
  }

  const multipleRemotes = remotes.length > 1
  const label = `${item.label}${multipleRemotes ? "..." : ""}`

  const onSelected = async () => {
    if (!multipleRemotes) {
      return onRemoteSelected(remotes[0])
    }

    const items: QuickPickItem[] = remotes.map((remote) => ({
      label: `$(globe) ${remote.label}`,
      onSelected: () => onRemoteSelected(remote),
    }))

    const options = { placeHolder: "Select a remote" }
    const selectedItem = await vscode.window.showQuickPick(items, options)

    selectedItem?.onSelected?.()
  }

  return { ...item, label, onSelected }
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
          context: { repository, filename },
        }))
    },

    async handleTerminalLink({ context }: FileTerminalLink) {
      vscode.window.showInformationMessage(
        `You clicked a file! ${context.filename}`,
      )
    },
  })
}
