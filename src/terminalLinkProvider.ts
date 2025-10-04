import * as vscode from "vscode"
import {
  CommitLinkMatcher,
  CommitRangeLinkMatcher,
  FileLinkMatcher,
  IssueLinkMatcher,
  LinkMatch,
  LocalBranchLinkMatcher,
  RemoteBranchLinkMatcher,
  TagLinkMatcher,
} from "./linkMatchers"
import { showSelectableQuickPick } from "./quickPick"
import { Repository } from "./Repository"
import { RepositoryStore, TerminalFolderStore } from "./stores"
import { TerminalContext } from "./TerminalContext"

interface TerminalOptions extends vscode.TerminalOptions {
  context?: TerminalContext
}

const matchers = {
  commit: CommitLinkMatcher,
  commitRange: CommitRangeLinkMatcher,
  file: FileLinkMatcher,
  issue: IssueLinkMatcher,
  localBranch: LocalBranchLinkMatcher,
  remoteBranch: RemoteBranchLinkMatcher,
  tag: TagLinkMatcher,
}

export type LinkMatcherType = keyof typeof matchers

export interface LinkMatchWithType<Context> extends LinkMatch<Context> {
  type: LinkMatcherType
}

interface TerminalLinkWithMatches extends vscode.TerminalLink {
  matches: LinkMatchWithType<any>[]
}

interface TerminalLink extends TerminalLinkWithMatches {
  repository: Repository
  terminalContext: Partial<TerminalContext>
}

export function terminalLinkProvider(
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
          .filter(([, matcher]) => matcher.shouldProvide(terminalContext))
          .map(async ([type, matcher]) => ({
            type: type as LinkMatcherType,
            matches: await matcher.findMatches(line, repository),
          })),
      )

      const matches: LinkMatchWithType<unknown>[] = matchesByType.flatMap(
        ({ type, matches }) => matches.map((match) => ({ ...match, type })),
      )

      return matchesToLinks(matches).map((link) => ({
        ...link,
        repository,
        terminalContext,
      }))
    },

    handleTerminalLink({ repository, terminalContext, matches }: TerminalLink) {
      const items = matches.map(({ type, context }) => {
        const { label, icon, handleMatch } = matchers[type]

        return {
          label: `$(${icon}) ${label}`,
          onSelected: () => handleMatch(context, terminalContext, repository),
        }
      })

      if (items.length === 1) {
        items[0].onSelected()
      } else {
        showSelectableQuickPick({
          placeholder: "Multiple objects with the same name, select a type",
          items,
        })
      }
    },
  })
}

export function matchesToLinks(
  matches: LinkMatchWithType<unknown>[],
): TerminalLinkWithMatches[] {
  return matches
    .filter((match) => !someOther(match, matches, overlapsEarlier))
    .filter((match) => !someOther(match, matches, sameStartLonger))
    .reduce((links, match) => {
      const existing = links.find((link) => equal(link, match))

      if (existing === undefined) {
        links.push({
          startIndex: match.startIndex,
          length: match.length,
          matches: [match],
        })
      } else {
        existing.matches.push(match)
      }

      return links
    }, [] as TerminalLinkWithMatches[])
    .map((link) => {
      const labels = link.matches.map(({ type }) => matchers[type].label)
      const choices = labels.map((l) => l.toLocaleLowerCase()).join("/")
      const tooltip = `Pick a ${choices} action`

      return { ...link, tooltip }
    })
}

function someOther<T>(
  item: T,
  items: T[],
  predicate: (a: T, b: T) => boolean,
): boolean {
  return items
    .filter((other) => other !== item)
    .some((other) => predicate(other, item))
}

function overlapsEarlier(
  a: vscode.TerminalLink,
  b: vscode.TerminalLink,
): boolean {
  return a.startIndex < b.startIndex && b.startIndex < a.startIndex + a.length
}

function sameStartLonger(
  a: vscode.TerminalLink,
  b: vscode.TerminalLink,
): boolean {
  return a.startIndex === b.startIndex && a.length > b.length
}

function equal(a: vscode.TerminalLink, b: vscode.TerminalLink): boolean {
  return a.startIndex === b.startIndex && a.length === b.length
}
