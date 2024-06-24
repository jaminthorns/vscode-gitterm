import * as vscode from "vscode"
import { RepositoryContext, StashContext, TerminalContext } from "../context"
import { RepositoryStore, TerminalFolderStore } from "../stores"
import { excludeNulls } from "../util"
import { TerminalOptions } from "./common"

interface StashTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & StashContext & Partial<TerminalContext>
}

export function stashLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
): vscode.Disposable {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<StashTerminalLink[]> {
      const provideStashLinks = vscode.workspace
        .getConfiguration("gitterm.terminalLinks")
        .get("provideStashLinks") as "always" | "never"

      if (provideStashLinks === "never") {
        return []
      }

      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const { context } = terminal.creationOptions as TerminalOptions
      const lineMatches = Array.from(line.matchAll(/stash@\{\d+\}/g))

      return excludeNulls(
        await Promise.all(
          lineMatches.map((match) => {
            const stash = match[0]

            return {
              startIndex: match.index,
              length: stash.length,
              tooltip: "Pick a stash action",
              context: { ...context, repository, stash },
            }
          }),
        ),
      )
    },

    handleTerminalLink({ context }: StashTerminalLink) {
      const { repository, stash } = context

      console.log("STASH", stash)
    },
  })
}
