import * as vscode from "vscode"

export type CommitString = string
export type Filename = string

export interface Commit {
  full: CommitString
  abbreviated: CommitString
}

// Files can be renamed, so it becomes necessary to know a file's historical
// names when doing operations across its history.
export type CommitFilenames = Map<CommitString, Filename>

export interface CommitContext {
  commit: Commit
}

export interface FileContext {
  filename: Filename
}

export interface LineContext extends FileContext {
  startLine: number
  endLine: number
}

export interface TerminalFileContext extends FileContext {
  commitFilenames: Promise<CommitFilenames | null>
}

export interface CommitTerminalLink extends vscode.TerminalLink {
  context: CommitContext & Partial<TerminalFileContext>
}

export interface FileTerminalLink extends vscode.TerminalLink {
  context: FileContext & Partial<CommitContext>
}
