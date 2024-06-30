import * as vscode from "vscode"
import { showCommitActions } from "../actions"
import { Commit } from "../Commit"
import { CommitContext } from "../context"
import { excludeNulls } from "../util"
import { LinkMatcher } from "./LinkMatcher"

export const CommitLinkMatcher: LinkMatcher<CommitContext> = {
  shouldProvide() {
    const provideCommitLinks = vscode.workspace
      .getConfiguration("gitterm.terminalLinks")
      .get("provideCommitLinks") as "always" | "never"

    switch (provideCommitLinks) {
      case "always":
        return true
      case "never":
        return false
    }
  },

  async findLinks(line, repository) {
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
              linkContext: { commit },
            }
          }
        }),
      ),
    )
  },

  async handleLink({ commit }, terminalContext, repository) {
    const commitFilenames = await ("commitFilenames" in terminalContext
      ? terminalContext.commitFilenames
      : undefined)

    const filename = commitFilenames?.get(commit.full)

    await showCommitActions(repository, commit, filename)
  },
}
