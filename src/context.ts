import { Commit, RawCommit } from "./Commit"
import Repository from "./Repository"

export type CommitFilenames = Map<RawCommit, string>

export interface RepositoryContext {
  repository: Repository
}

export interface CommitContext {
  commit: Commit
}

export interface FileContext {
  filename: string
}

interface FileTerminalContext extends FileContext {
  commitFilenames: Promise<CommitFilenames | null>
}

type FileAtCommitContext = CommitContext & FileContext

export type TerminalContext =
  | FileTerminalContext // Showing file or line history
  | CommitContext // Showing a commit
  | FileAtCommitContext // Showing a file at a commit
