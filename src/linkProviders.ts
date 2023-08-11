import * as vscode from "vscode"
import { basename } from "path"
import { CommitTerminalLink, FileTerminalLink } from "./types"
import StringTrie from "./StringTrie"
import { gitCommand, parseCommit, runCommandInTerminal } from "./util"

export const commitLinkProvider = vscode.window.registerTerminalLinkProvider({
  async provideTerminalLinks({
    line,
    terminal,
  }): Promise<CommitTerminalLink[]> {
    const options = terminal.creationOptions
    const context = "context" in options ? (options.context as object) : {}
    const lineMatches = Array.from(line.matchAll(/([0-9a-f]{7,40})/g))

    const possibleMatches = await Promise.all(
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
    )

    return possibleMatches.filter((l) => l !== null) as CommitTerminalLink[]
  },

  async handleTerminalLink({ context }: CommitTerminalLink) {
    const { commit, path, commitPaths } = context
    const placeHolder = `Select an action for commit ${commit.abbreviated}`

    const commitPath =
      path !== undefined && commitPaths !== undefined
        ? (await commitPaths)?.get(commit.full) ?? null
        : null

    const commitItems = [
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
    ]

    let selectedItem

    if (commitPath === null) {
      selectedItem = await vscode.window.showQuickPick(commitItems, {
        placeHolder,
      })
    } else {
      const file = basename(commitPath)
      const context = { commit, path: commitPath }
      const commandContext = { commit: commit.full, path: commitPath }

      const fileItems = [
        {
          label: "$(git-compare) Show File Diff",
          description: commitPath,
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
          description: commitPath,
          onSelected: () => {
            runCommandInTerminal({
              name: `File: ${file} (${commit.abbreviated})`,
              icon: "file",
              context,
              command: gitCommand("showFileContentsAtCommit", commandContext),
            })
          },
        },
      ]

      selectedItem = await vscode.window.showQuickPick(
        [...commitItems, ...fileItems],
        { placeHolder },
      )
    }

    selectedItem?.onSelected()
  },
})

export const fileLinkProvider = (filenames: StringTrie) =>
  vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({ line }): Promise<FileTerminalLink[]> {
      return filenames.findMatches(line).map(({ index, text: file }) => ({
        startIndex: index,
        length: file.length,
        tooltip: "Pick a file action",
        context: { file },
      }))
    },

    async handleTerminalLink({ context }: FileTerminalLink) {
      vscode.window.showInformationMessage(
        `You clicked a file! ${context.file}`,
      )
    },
  })
