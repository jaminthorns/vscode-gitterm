import * as vscode from "vscode"
import { runGitCommand } from "./util"

export type RawCommit = string

export interface Commit {
  full: RawCommit
  abbreviated: RawCommit
}

export async function Commit(
  commit: RawCommit,
  directory: vscode.Uri,
): Promise<Commit | null> {
  try {
    const [full, abbreviated] = await Promise.all([
      runGitCommand("rev-parse", directory, [commit]),
      runGitCommand("rev-parse", directory, ["--short", commit]),
    ])

    return { full, abbreviated }
  } catch (error) {
    return null
  }
}

export interface CommitInfo {
  authorDate: Date
  authorName: string
  subject: string
}

export async function CommitInfo(
  commit: RawCommit,
  directory: vscode.Uri,
): Promise<CommitInfo> {
  const rawInfo = await runGitCommand("log", directory, [
    "--format=%aI\t%an\t%s",
    "--max-count=1",
    commit,
  ])

  const [rawAuthorDate, authorName, subject] = rawInfo.split("\t")

  return {
    authorDate: new Date(rawAuthorDate),
    authorName,
    subject,
  }
}
