import * as vscode from "vscode"
import { showSelectableQuickPick } from "../quickPick"
import { remoteItems } from "../remoteItems"
import { openUrl } from "../util"
import { LinkMatcher } from "./LinkMatcher"

export const IssueLinkMatcher: LinkMatcher<{ issueNumber: string }> = {
  label: "Issue",
  prompt: "Open issue on remote",
  icon: "issues",

  shouldProvide(terminalContext, repository) {
    const remotes = repository.remoteProviders.sorted()

    if (remotes.length === 0) {
      return false
    }

    const provideIssueLinks = vscode.workspace
      .getConfiguration("gitsquatch.terminalLinks")
      .get("provideIssueLinks") as "always" | "never"

    switch (provideIssueLinks) {
      case "always":
        return true
      case "never":
        return false
    }
  },

  findMatches(line) {
    const lineMatches = Array.from(line.matchAll(/#(\d+)/g))

    return lineMatches.map((match) => {
      const [issueHandle, issueNumber] = match

      return {
        startIndex: match.index,
        length: issueHandle.length,
        context: { issueNumber },
      }
    })
  },

  handleMatch({ issueNumber }, terminalContext, repository) {
    const remotes = repository.remoteProviders.sorted()

    if (remotes.length === 1) {
      const url = remotes[0].issueUrl(issueNumber)

      if (url !== null) {
        openUrl(url)
      }
    } else {
      showSelectableQuickPick({
        placeholder: "Select a remote to open issue on",
        items: remoteItems(remotes, (provider) =>
          provider.issueUrl(issueNumber),
        ),
      })
    }
  },
}
