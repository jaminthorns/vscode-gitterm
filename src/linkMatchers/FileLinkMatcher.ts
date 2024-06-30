import * as vscode from "vscode"
import { showFileActions } from "../actions"
import { FileContext } from "../context"
import { LinkMatcher } from "./LinkMatcher"

export const FileLinkMatcher: LinkMatcher<FileContext> = {
  shouldProvide(terminalContext) {
    const provideFileLinks = vscode.workspace
      .getConfiguration("gitterm.terminalLinks")
      .get("provideFileLinks") as "always" | "never" | "withRevisionContext"

    switch (provideFileLinks) {
      case "always":
        return true
      case "never":
        return false
      case "withRevisionContext":
        return "commit" in terminalContext
    }
  },

  findLinks(line, repository) {
    return repository.filenames
      .findMatches(line)
      .map(({ startIndex, text: filename }) => ({
        startIndex,
        length: filename.length,
        tooltip: "Pick a file action",
        linkContext: { filename },
      }))
  },

  handleLink({ filename }, terminalContext, repository) {
    const commit =
      "commit" in terminalContext ? terminalContext.commit : undefined

    showFileActions(repository, filename, commit)
  },
}
