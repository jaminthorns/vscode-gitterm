import * as vscode from "vscode"
import { showReferenceActions } from "../actions"
import { ReferenceContext } from "../context"
import { LinkMatcher } from "./LinkMatcher"

export const ReferenceLinkMatcher: LinkMatcher<ReferenceContext> = {
  shouldProvide() {
    const provideReferenceLinks = vscode.workspace
      .getConfiguration("gitterm.terminalLinks")
      .get("provideReferenceLinks") as "always" | "never"

    switch (provideReferenceLinks) {
      case "always":
        return true
      case "never":
        return false
    }
  },

  findLinks(line, repository) {
    return repository.references
      .findMatches(line)
      .map(({ startIndex, text: reference, value: types }) => ({
        startIndex,
        length: reference.length,
        tooltip: "Pick a reference action",
        linkContext: { reference, types },
      }))
  },

  async handleLink({ reference, types }, terminalContext, repository) {
    await showReferenceActions(repository, reference, types)
  },
}
