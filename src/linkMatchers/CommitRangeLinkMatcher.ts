import * as vscode from "vscode"
import { showCommitRangeActions } from "../actions"
import { Commit } from "../Commit"
import { excludeNulls } from "../util"
import { LinkMatcher } from "./LinkMatcher"

export const CommitRangeLinkMatcher: LinkMatcher<{
  fromCommit: Commit
  toCommit: Commit
}> = {
  label: "Commit Range",
  prompt: "Select a commit range action",
  icon: "git-compare",

  shouldProvide() {
    const provideCommitLinks = vscode.workspace
      .getConfiguration("gitterm.terminalLinks")
      .get("provideCommitRangeLinks") as "always" | "never"

    switch (provideCommitLinks) {
      case "always":
        return true
      case "never":
        return false
    }
  },

  async findMatches(line, repository) {
    const lineMatches = Array.from(
      line.matchAll(/([0-9a-f]{7,40})\.\.([0-9a-f]{7,40})/g),
    )

    return excludeNulls(
      await Promise.all(
        lineMatches.map(async (match) => {
          const [commitRange, fromCommitRaw, toCommitRaw] = match
          const fromCommit = await Commit(fromCommitRaw, repository.directory)
          const toCommit = await Commit(toCommitRaw, repository.directory)

          if (
            fromCommit === null ||
            toCommit === null ||
            // Prevent commit-looking references from being matched.
            !fromCommit.full.includes(fromCommitRaw) ||
            !toCommit.full.includes(toCommitRaw)
          ) {
            return null
          } else {
            return {
              startIndex: match.index,
              length: commitRange.length,
              context: { fromCommit, toCommit },
            }
          }
        }),
      ),
    )
  },

  handleMatch({ fromCommit, toCommit }, terminalContext, repository) {
    showCommitRangeActions(repository, fromCommit, toCommit)
  },
}
