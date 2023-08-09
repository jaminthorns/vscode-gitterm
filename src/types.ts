import * as vscode from "vscode"
import { commitPaths } from "./util"

export interface Commit {
  full: string
  abbreviated: string
}

export interface CommitContext {
  commit: Commit
}

export interface PathContext {
  path: string
  commitPaths: ReturnType<typeof commitPaths>
}

export interface CommitTerminalLink extends vscode.TerminalLink {
  context: CommitContext & Partial<PathContext>
}
