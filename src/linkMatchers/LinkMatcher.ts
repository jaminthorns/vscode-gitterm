import * as vscode from "vscode"
import { TerminalContext } from "../context"
import { Repository } from "../Repository"

export interface MatcherLink<LinkContext> extends vscode.TerminalLink {
  linkContext: LinkContext
}

type MaybePromise<T> = T | Promise<T>

export interface LinkMatcher<LinkContext> {
  shouldProvide(terminalContext: Partial<TerminalContext>): boolean

  findLinks(
    line: string,
    repository: Repository,
  ): MaybePromise<MatcherLink<LinkContext>[]>

  handleLink(
    linkContext: LinkContext,
    terminalContext: Partial<TerminalContext>,
    repository: Repository,
  ): MaybePromise<void>
}
