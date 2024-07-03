import { Commit } from "./Commit"

export type CommitFilenames = Map<string, string>

interface CommitContext {
  commit: Commit
}

interface FolderContext {
  folder: string
}

interface FileContext {
  filename: string
}

interface FileHistoryContext extends FileContext {
  commitFilenames: Promise<CommitFilenames | null>
}

export type TerminalContext =
  | {} // Showing something without any context
  | CommitContext // Showing a commit
  | (CommitContext & FileContext) // Showing a file at a commit
  | FolderContext // Showing folder history
  | FileHistoryContext // Showing file/line history
  | (CommitContext & FileHistoryContext) // Showing file/line history from a commit
