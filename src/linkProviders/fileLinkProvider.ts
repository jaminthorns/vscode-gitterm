import * as vscode from "vscode"
import { showFileActions } from "../actions"
import { FileContext, RepositoryContext, TerminalContext } from "../context"
import { RepositoryStore, TerminalFolderStore } from "../stores"
import { TerminalOptions } from "./common"

interface FileTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & FileContext & Partial<TerminalContext>
}

export function fileLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
): vscode.Disposable {
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

      showFileActions(repository, filename, commit)
    },
  })
}
