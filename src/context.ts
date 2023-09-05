import { Commit, RawCommit } from "./Commit"
import Repository from "./Repository"

export interface RepositoryContext {
  repository: Repository
}

export interface CommitContext {
  commit: Commit
}

export interface RawCommitContext {
  commit: RawCommit
}

export interface FileContext {
  filename: string
}

export interface FileLineContext extends FileContext {
  startLine: number
  endLine: number
}
