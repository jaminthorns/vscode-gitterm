import * as vscode from "vscode"
import { showCommitActions } from "../actions"
import { Commit } from "../Commit"
import { excludeNulls } from "../util"
import { LinkMatcher } from "./LinkMatcher"

export const CommitLinkMatcher: LinkMatcher<{ commit: Commit }> = {
  label: "Commit",
  prompt: "Select a commit action",
  icon: "git-commit",

  shouldProvide() {
    const provideCommitLinks = vscode.workspace
      .getConfiguration("gitsquatch.terminalLinks")
      .get("provideCommitLinks") as "always" | "never"

    switch (provideCommitLinks) {
      case "always":
        return true
      case "never":
        return false
    }
  },

  async findMatches(line, repository) {
    const lineMatches = Array.from(line.matchAll(/([0-9a-f]{7,40})/g))

    return excludeNulls(
      await Promise.all(
        lineMatches.map(async (match) => {
          const [rawCommit] = match
          const commit = await Commit(rawCommit, repository.directory)

          if (
            commit === null ||
            // Prevent commit-looking references from being matched.
            !commit.full.includes(rawCommit)
          ) {
            return null
          } else {
            return {
              startIndex: match.index,
              length: rawCommit.length,
              context: { commit },
            }
          }
        }),
      ),
    )
  },

  async handleMatch({ commit }, terminalContext, repository) {
    const commitFilenames = await ("commitFilenames" in terminalContext
      ? terminalContext.commitFilenames
      : undefined)

    const filename = commitFilenames?.get(commit.full)

    await showCommitActions(repository, commit, filename)
  },
}
