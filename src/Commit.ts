import * as vscode from "vscode"
import { runCommand } from "./util"

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
      runCommand("git", ["rev-parse", raw], directory),
      runCommand("git", ["rev-parse", "--short", raw], directory),
    ])

    return { full, abbreviated }
  } catch (error) {
    return null
  }
}
