import * as vscode from "vscode"
import { git } from "./util"

export interface Commit {
  full: string
  short: string
}

export async function Commit(
  revision: string,
  directory: vscode.Uri,
): Promise<Commit | null> {
  try {
    const arg = `${revision}^{commit}`
    const commits = await git("rev-parse", [arg, "--short", arg], { directory })
    const [full, short] = commits.split("\n")

    return { full, short }
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
  revision: string,
  directory: vscode.Uri,
): Promise<CommitInfo> {
  const args = ["--format=%aI\t%an\t%s", "--max-count=1", revision]
  const rawInfo = await git("log", args, { directory })

  const [rawAuthorDate, authorName, subject] = rawInfo.split("\t")

  return {
    authorDate: new Date(rawAuthorDate),
    authorName,
    subject,
  }
}
