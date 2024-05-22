import { existsSync } from "fs"
import { basename } from "path"
import * as vscode from "vscode"
import { FileContext, RepositoryContext, TerminalContext } from "../context"
import { SelectableQuickPickItem, showSelectableQuickPick } from "../quickPick"
import RepositoryStore from "../RepositoryStore"
import TerminalFolderStore from "../TerminalFolderStore"
import {
  commitFilenames,
  excludeNulls,
  runCommandInTerminal,
  userGitCommand,
} from "../util"
import { TerminalOptions, commitRemotes } from "./common"
import { fileAtCommitItems } from "./fileAtCommitItems"

interface FileTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & FileContext & Partial<TerminalContext>
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
        .get("provideFileLinks") as "always" | "never" | "withRevisionContext"

      if (provideFileLinks === "never") {
        return []
      }

      const { context } = terminal.creationOptions as TerminalOptions
      const commit = context && "commit" in context ? context.commit : undefined

      if (commit === undefined && provideFileLinks === "withRevisionContext") {
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

    handleTerminalLink({ context }: FileTerminalLink) {
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
                variables: { revision: "HEAD", filename },
              }),
              context: {
                commit,
                filename,
                commitFilenames: commitFilenames(
                  "HEAD",
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
        const remotes = commitRemotes(commit, repository)

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
