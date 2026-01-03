import * as vscode from "vscode"
import { showReferenceActions } from "../actions"
import { ReferenceType, referenceInfo } from "../references"
import { LinkMatcher } from "./LinkMatcher"

export function createReferenceLinkMatcher({
  type,
  store,
}: {
  type: ReferenceType
  store: "localBranches" | "remoteBranches" | "tags"
}): LinkMatcher<{ reference: string }> {
  return {
    label: referenceInfo[type].label,
    prompt: `Select a ${referenceInfo[type].label.toLocaleLowerCase()} action`,
    icon: referenceInfo[type].icon,

    shouldProvide() {
      const provideReferenceLinks = vscode.workspace
        .getConfiguration("gitsquatch.terminalLinks")
        .get("provideReferenceLinks") as "always" | "never"

      switch (provideReferenceLinks) {
        case "always":
          return true
        case "never":
          return false
      }
    },

    findMatches(line, repository) {
      return repository[store]
        .findMatches(line)
        .flatMap(({ startIndex, text: reference }) => ({
          startIndex,
          length: reference.length,
          context: { reference },
        }))
    },

    handleMatch({ reference }, terminalContext, repository) {
      showReferenceActions(repository, type, reference)
    },
  }
}
