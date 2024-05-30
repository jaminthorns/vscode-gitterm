import * as vscode from "vscode"
import { showReferenceActions } from "../actions"
import {
  ReferenceContext,
  RepositoryContext,
  TerminalContext,
} from "../context"
import { RepositoryStore, TerminalFolderStore } from "../stores"
import { TerminalOptions } from "./common"

interface ReferenceTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & ReferenceContext & Partial<TerminalContext>
}

export function referenceLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
): vscode.Disposable {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<ReferenceTerminalLink[]> {
      const provideReferenceLinks = vscode.workspace
        .getConfiguration("gitterm.terminalLinks")
        .get("provideReferenceLinks") as "always" | "never"

      if (provideReferenceLinks === "never") {
        return []
      }

      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const { context } = terminal.creationOptions as TerminalOptions

      return repository.references
        .findMatches(line)
        .map(({ startIndex, text: reference, value: types }) => ({
          startIndex,
          length: reference.length,
          tooltip: "Pick a reference action",
          context: { ...context, repository, reference, types },
        }))
    },

    async handleTerminalLink({ context }: ReferenceTerminalLink) {
      const { repository, reference, types } = context

      await showReferenceActions(repository, reference, types)
    },
  })
}
