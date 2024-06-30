import * as vscode from "vscode"
import { TerminalContext } from "./context"
import {
  CommitLinkMatcher,
  FileLinkMatcher,
  MatcherLink,
  ReferenceLinkMatcher,
} from "./linkMatchers"
import { Repository } from "./Repository"
import { RepositoryStore, TerminalFolderStore } from "./stores"

interface TerminalOptions extends vscode.TerminalOptions {
  context?: TerminalContext
}

const matchers = {
  commit: { rank: 1, matcher: CommitLinkMatcher },
  file: { rank: 2, matcher: FileLinkMatcher },
  reference: { rank: 3, matcher: ReferenceLinkMatcher },
}

interface TerminalLink extends MatcherLink<any> {
  type: keyof typeof matchers
  repository: Repository
  terminalContext: Partial<TerminalContext>
}

export function linkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
): vscode.Disposable {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({ line, terminal }): Promise<TerminalLink[]> {
      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const terminalOptions = terminal.creationOptions as TerminalOptions
      const terminalContext = terminalOptions.context ?? {}

      const matchesByType = await Promise.all(
        Object.entries(matchers)
          .filter(([, { matcher }]) => matcher.shouldProvide(terminalContext))
          .map(async ([type, { matcher }]) => ({
            type,
            links: await matcher.findLinks(line, repository),
          })),
      )

      const matches = matchesByType.flatMap(({ type, links }) =>
        links.map((link) => ({ type, repository, terminalContext, ...link })),
      )

      return matches as TerminalLink[]
    },

    async handleTerminalLink({
      type,
      repository,
      linkContext,
      terminalContext,
    }: TerminalLink) {
      const { matcher } = matchers[type]
      await matcher.handleLink(linkContext, terminalContext, repository)
    },
  })
}
