import * as vscode from "vscode"
import { runGitCommand } from "./util"

export type RawCommit = string

export interface Commit {
  full: RawCommit
  abbreviated: RawCommit
}

export async function Commit(
  raw: RawCommit,
  directory: vscode.Uri,
): Promise<Commit | null> {
  try {
    const [full, abbreviated] = await Promise.all([
      runGitCommand("rev-parse", directory, [raw]),
      runGitCommand("rev-parse", directory, ["--short", raw]),
    ])

    return { full, abbreviated }
  } catch (error) {
    return null
  }
}
