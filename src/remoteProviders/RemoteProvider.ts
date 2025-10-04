import * as vscode from "vscode"
import { Commit } from "../Commit"
import { Remote } from "../Remote"
import { GitHubProvider } from "./GitHubProvider"
import { UnsupportedProvider } from "./UnsupportedProvider"

export interface RemoteProvider {
  remote: Remote
  label: string
  commitUrl(commit: Commit): vscode.Uri | null
  referenceUrl(reference: string): vscode.Uri | null
  fileAtCommitUrl(commit: Commit, filename: string): vscode.Uri | null
  issueUrl(issueNumber: string): vscode.Uri | null
}

// TODO: Implement more providers.
export function RemoteProvider(remote: Remote): RemoteProvider {
  switch (remote.server.host) {
    case "github.com":
      return GitHubProvider(remote)
    default:
      return UnsupportedProvider(remote)
  }
}
