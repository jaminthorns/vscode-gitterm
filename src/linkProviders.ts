import { basename } from "path"
import * as vscode from "vscode"
import RemoteProvider from "./RemoteProvider"
import Repository from "./Repository"
import RepositoryStore from "./RepositoryStore"
import TerminalFolderStore from "./TerminalFolderStore"
import { Commit, FileContext, TerminalFileContext } from "./types"
import {
  excludeNulls,
  gitCommand,
  parseCommit,
  runCommandInTerminal,
} from "./util"

type QuickPickItem = vscode.QuickPickItem & { onSelected?: () => void }

interface RepositoryContext {
  repository: Repository
}

interface CommitContext {
  commit: Commit
}

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
            const commit = await parseCommit(rawCommit, repository.directory)

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

      const options = {
        placeHolder: `Select an action for commit ${commit.abbreviated}`,
      }

      const commitFilename =
        filename !== undefined && commitFilenames !== undefined
          ? (await commitFilenames)?.get(commit.full) ?? null
          : null

      const commitItems: QuickPickItem[] = excludeNulls([
        {
          label: "Commit Actions",
          kind: vscode.QuickPickItemKind.Separator,
        },
        {
          label: "$(git-commit) Show Commit",
          onSelected: () => {
            runCommandInTerminal({
              name: `Commit: ${commit.abbreviated}`,
              icon: "git-commit",
              cwd: repository.directory,
              command: gitCommand("showCommit", { commit: commit.full }),
              context: { commit },
            })
          },
        },
        {
          label: "$(files) Copy Commit to Clipboard",
          onSelected: () => {
            vscode.env.clipboard.writeText(commit.full)
          },
        },
        pickRemote(
          repository.remotes,
          { label: "$(link-external) Open Commit on Remote" },
          (remote) => {
            // TODO: Handle when a remote doesn't contain a commit
            const url = remote.commitUrl(commit)
            vscode.env.openExternal(url)
          },
        ),
      ])

      let selectedItem

      if (commitFilename === null) {
        selectedItem = await vscode.window.showQuickPick(commitItems, options)
      } else {
        const file = basename(commitFilename)
        const context = { commit, filename: commitFilename }
        const commandContext = { commit: commit.full, filename: commitFilename }

        const fileItems: QuickPickItem[] = excludeNulls([
          {
            label: "File Actions",
            kind: vscode.QuickPickItemKind.Separator,
          },
          {
            label: "$(git-compare) Show File Diff",
            description: commitFilename,
            onSelected: () => {
              runCommandInTerminal({
                name: `Diff: ${file} (${commit.abbreviated})`,
                icon: "git-compare",
                cwd: repository.directory,
                context,
                command: gitCommand("showFileDiffAtCommit", commandContext),
              })
            },
          },
          {
            label: "$(file) Show File at Commit",
            description: commitFilename,
            onSelected: () => {
              runCommandInTerminal({
                name: `File: ${file} (${commit.abbreviated})`,
                icon: "file",
                cwd: repository.directory,
                context,
                command: gitCommand("showFileContentsAtCommit", commandContext),
              })
            },
          },
          pickRemote(
            repository.remotes,
            {
              label: "$(link-external) Open File at Commit on Remote",
              description: commitFilename,
            },
            (remote) => {
              // TODO: Handle when a remote doesn't contain a commit
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
