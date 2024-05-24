import { Commit, RawCommit } from "./Commit"
import { ReferenceType } from "./references"
import { Repository } from "./Repository"

export type CommitFilenames = Map<RawCommit, string>

export interface RepositoryContext {
  repository: Repository
}

export interface CommitContext {
  commit: Commit
}

export interface ReferenceContext {
  reference: string
  types: Set<ReferenceType>
}

export interface FolderContext {
  folder: string
}

export interface FileContext {
  filename: string
}

interface FileHistoryContext extends FileContext {
  commitFilenames: Promise<CommitFilenames | null>
}

type FileAtCommitContext = CommitContext & FileContext

type FileAtCommitHistoryContext = CommitContext & FileHistoryContext

export type TerminalContext =
  | CommitContext // Showing a commit
  | FileAtCommitContext // Showing a file at a commit
  | FolderContext // Showing folder history
  | FileHistoryContext // Showing file/line history
  | FileAtCommitHistoryContext // Showing file/line history from a commit
