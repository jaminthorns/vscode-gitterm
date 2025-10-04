import * as vscode from "vscode"
import { pickRemote } from "../actions/pickRemote"
import { RemoteProvider } from "../remoteProviders"
import { LinkMatch, LinkMatcher } from "./LinkMatcher"

interface IssueMatchContext {
  issueNumber: string
}

export const IssueLinkMatcher: LinkMatcher<IssueMatchContext> = {
  label: "Issue",
  icon: "issues",

  shouldProvide() {
    return true
  },

  findMatches(line) {
    const matches: LinkMatch<IssueMatchContext>[] = []
    const issuePattern = /#(\d+)/g
    let match: RegExpExecArray | null

    while ((match = issuePattern.exec(line)) !== null) {
      matches.push({
        startIndex: match.index!,
        length: match[0].length,
        context: {
          issueNumber: match[1],
        },
      })
    }

    return matches
  },

  handleMatch({ issueNumber }, _terminalContext, repository) {
    const remotes = repository.remoteProviders.sorted()

    const supportedRemotes = remotes.filter((remote: RemoteProvider) => {
      // Check if the remote supports issue URLs by testing with a dummy number
      const testUrl = remote.issueUrl("1")
      return testUrl !== null
    })

    if (supportedRemotes.length === 0) {
      vscode.window.showErrorMessage(
        "No supported remotes found for opening issues.",
      )
      return
    }

    const item = pickRemote(
      supportedRemotes,
      {
        label: `$(issues) Open Issue #${issueNumber}`,
        onSelected: () => {}, // Will be overridden by pickRemote
      },
      (provider: RemoteProvider) => provider.issueUrl(issueNumber),
    )

    if (item?.onSelected) {
      item.onSelected()
    }
  },
}
