import { basename } from "path"
import * as vscode from "vscode"
import FilenameStore from "./FilenameStore"
import { RemoteProvider } from "./remoteProviders"
import { CommitTerminalLink, FileTerminalLink } from "./types"
import {
  excludeNulls,
  gitCommand,
  parseCommit,
  runCommandInTerminal,
} from "./util"

export function commitLinkProvider(remotes: RemoteProvider[]) {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<CommitTerminalLink[]> {
      const options = terminal.creationOptions
      const context = "context" in options ? (options.context as object) : {}
      const lineMatches = Array.from(line.matchAll(/([0-9a-f]{7,40})/g))

      return excludeNulls(
        await Promise.all(
          lineMatches.map(async ([match, rawCommit]) => {
            const commit = await parseCommit(rawCommit)

            if (commit === null) {
              return null
            } else {
              const matchStart = line.indexOf(match)
              const startIndex = matchStart + match.indexOf(rawCommit)

              return {
                startIndex,
                length: rawCommit.length,
                tooltip: "Pick a commit action",
                context: { ...context, commit },
              }
            }
          }),
        ),
      )
    },

    async handleTerminalLink({ context }: CommitTerminalLink) {
      const { commit, filename, commitFilenames } = context
      const placeHolder = `Select an action for commit ${commit.abbreviated}`

      const commitFilename =
        filename !== undefined && commitFilenames !== undefined
          ? (await commitFilenames)?.get(commit.full) ?? null
          : null

      const commitItems = [
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
        // TODO: Turn this into a nested quick pick
        ...remotes.map((remote) => ({
          label: `$(link-external) Open Commit on ${remote.label}`,
          onSelected: () => {
            // TODO: Handle when a remote doesn't contain a commit
            const url = remote.commitUrl(commit)
            vscode.env.openExternal(url)
          },
        })),
      ]

      let selectedItem

      if (commitFilename === null) {
        selectedItem = await vscode.window.showQuickPick(commitItems, {
          placeHolder,
        })
      } else {
        const file = basename(commitFilename)
        const context = { commit, filename: commitFilename }
        const commandContext = { commit: commit.full, filename: commitFilename }

        const fileItems = [
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
                context,
                command: gitCommand("showFileContentsAtCommit", commandContext),
              })
            },
          },
          ...remotes.map((remote) => ({
            label: `$(link-external) Open File at Commit on ${remote.label}`,
            description: commitFilename,
            onSelected: () => {
              const url = remote.fileAtCommitUrl(commit, commitFilename)
              vscode.env.openExternal(url)
            },
          })),
        ]

        selectedItem = await vscode.window.showQuickPick(
          [...commitItems, ...fileItems],
          { placeHolder },
        )
      }

      selectedItem?.onSelected?.()
    },
  })
}

export function fileLinkProvider(filenameStore: FilenameStore) {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({ line }): Promise<FileTerminalLink[]> {
      return filenameStore.filenames
        .findMatches(line)
        .map(({ startIndex, text: filename }) => ({
          startIndex,
          length: filename.length,
          tooltip: "Pick a file action",
          context: { filename },
        }))
    },

    async handleTerminalLink({ context }: FileTerminalLink) {
      vscode.window.showInformationMessage(
        `You clicked a file! ${context.filename}`,
      )
    },
  })
}
