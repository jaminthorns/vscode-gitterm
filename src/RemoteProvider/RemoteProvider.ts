import * as vscode from "vscode"
import { Commit } from "../Commit"
import { Remote } from "../Remote"

export interface RemoteProvider {
  remote: Remote
  label: string
  commitUrl(commit: Commit): vscode.Uri | null
  referenceUrl(reference: string): vscode.Uri | null
  fileAtCommitUrl(commit: Commit, filename: string): vscode.Uri | null
}
