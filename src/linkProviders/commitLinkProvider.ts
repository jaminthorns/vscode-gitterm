import * as vscode from "vscode"
import { showCommitActions } from "../actions"
import { Commit } from "../Commit"
import { CommitContext, RepositoryContext, TerminalContext } from "../context"
import { RepositoryStore, TerminalFolderStore } from "../stores"
import { excludeNulls } from "../util"
import { TerminalOptions } from "./common"

interface CommitTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & CommitContext & Partial<TerminalContext>
}

export function commitLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
): vscode.Disposable {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<CommitTerminalLink[]> {
      const provideCommitLinks = vscode.workspace
        .getConfiguration("gitterm.terminalLinks")
        .get("provideCommitLinks") as "always" | "never"

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
          lineMatches.map(async (match) => {
            const rawCommit = match[0]
            const commit = await Commit(rawCommit, repository.directory)

            if (commit === null) {
              return null
            } else {
              return {
                startIndex: match.index,
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

      const commitFilenames = await ("commitFilenames" in context
        ? context.commitFilenames
        : undefined)

      const filename = commitFilenames?.get(commit.full)

      await showCommitActions(repository, commit, filename)
    },
  })
}
