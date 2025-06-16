import * as vscode from "vscode"
import { Commit } from "../Commit"
import { excludeNulls } from "../util"
import { LinkMatcher } from "./LinkMatcher"

export const CommitRangeLinkMatcher: LinkMatcher<{
  startCommit: Commit
  endCommit: Commit
}> = {
  label: "Commit Range",
  icon: "git-compare",

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

  async findMatches(line, repository) {
    const lineMatches = Array.from(
      line.matchAll(/([0-9a-f]{7,40})\.\.([0-9a-f]{7,40})/g),
    )

    return excludeNulls(
      await Promise.all(
        lineMatches.map(async (match) => {
          const rawStartCommit = match[1]
          const rawEndCommit = match[2]

          const startCommit = await Commit(rawStartCommit, repository.directory)
          const endCommit = await Commit(rawEndCommit, repository.directory)

          if (startCommit === null || endCommit === null) {
            return null
          } else {
            return {
              startIndex: match.index,
              length: match[0].length,
              context: { startCommit, endCommit },
            }
          }
        }),
      ),
    )
  },

  handleMatch({ startCommit, endCommit }, terminalContext, repository) {
    const rangeHistoryCommand = vscode.workspace
      .getConfiguration("gitterm.gitCommands")
      .get("rangeHistory") as string

    const command = rangeHistoryCommand
      .replace("${startCommit}", startCommit.full)
      .replace("${endCommit}", endCommit.full)
      .replace("${range}", `${startCommit.short}..${endCommit.short}`)

    const terminal = vscode.window.createTerminal({
      name: `GitTerm: ${startCommit.short}..${endCommit.short}`,
      cwd: repository.directory,
    })

    terminal.sendText(command)
    terminal.show()
  },
}
