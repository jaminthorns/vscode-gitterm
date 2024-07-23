import * as vscode from "vscode"
import { showCommitActions } from "../actions"
import { Commit } from "../Commit"
import { ReflogContext, RepositoryContext, TerminalContext } from "../context"
import { RepositoryStore, TerminalFolderStore } from "../stores"
import { excludeNulls } from "../util"
import { TerminalOptions } from "./common"

interface ReflogTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & ReflogContext & Partial<TerminalContext>
}

export function reflogLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
): vscode.Disposable {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<ReflogTerminalLink[]> {
      const provideReflogLinks = vscode.workspace
        .getConfiguration("gitterm.terminalLinks")
        .get("provideReflogLinks") as "always" | "never"

      if (provideReflogLinks === "never") {
        return []
      }

      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const { context } = terminal.creationOptions as TerminalOptions
      const lineMatches = Array.from(line.matchAll(/(\S+)@\{(\d+)\}/g))

      return excludeNulls(
        await Promise.all(
          lineMatches.map((match) => {
            const entry = match[0]
            const reference = match[1]
            const index = parseInt(match[2])

            return {
              startIndex: match.index,
              length: entry.length,
              tooltip: "Pick a reflog action",
              context: { ...context, repository, reference, index },
            }
          }),
        ),
      )
    },

    async handleTerminalLink({ context }: ReflogTerminalLink) {
      const { repository, reference, index } = context

      const entry = `${reference}@{${index}}`
      const commit = await Commit(entry, repository.directory)

      if (commit === null) {
        return
      }

      await showCommitActions(repository, commit)
    },
  })
}
