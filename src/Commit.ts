import * as vscode from "vscode"
import { git } from "./util"

export type RawCommit = string

export interface Commit {
  full: RawCommit
  abbreviated: RawCommit
  revision: string
}

export async function Commit(
  revision: string,
  directory: vscode.Uri,
): Promise<Commit | null> {
  try {
    const [full, abbreviated] = await Promise.all([
      git("rev-parse", [`${revision}^{commit}`], { directory }),
      git("rev-parse", ["--short", `${revision}^{commit}`], { directory }),
    ])

    return { full, abbreviated, revision }
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
