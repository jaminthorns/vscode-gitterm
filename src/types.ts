type CommitString = string
type Filename = string

export interface Commit {
  full: CommitString
  abbreviated: CommitString
}

export type CommitFilenames = Map<CommitString, Filename>

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
