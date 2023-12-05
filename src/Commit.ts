import * as vscode from "vscode"
import { git } from "./util"

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
      git("rev-parse", [commit], { directory }),
      git("rev-parse", ["--short", commit], { directory }),
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
  const args = ["--format=%aI\t%an\t%s", "--max-count=1", commit]
  const rawInfo = await git("log", args, { directory })

  const [rawAuthorDate, authorName, subject] = rawInfo.split("\t")

  return {
    authorDate: new Date(rawAuthorDate),
    authorName,
    subject,
  }
}
