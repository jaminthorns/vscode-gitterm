import { Repository } from "../Repository"
import { TerminalContext } from "../TerminalContext"

export interface LinkMatch<MatchContext> {
  startIndex: number
  length: number
  context: MatchContext
}

type MaybePromise<T> = T | Promise<T>

export interface LinkMatcher<MatchContext> {
  label: string
  prompt: string
  icon: string

  shouldProvide(
    terminalContext: Partial<TerminalContext>,
    repository: Repository,
  ): boolean

  findMatches(
    line: string,
    repository: Repository,
  ): MaybePromise<LinkMatch<MatchContext>[]>

  handleMatch(
    matchContext: MatchContext,
    terminalContext: Partial<TerminalContext>,
    repository: Repository,
  ): MaybePromise<void>
}
