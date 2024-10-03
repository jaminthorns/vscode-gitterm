import * as vscode from "vscode"
import { Commit } from "../Commit"
import { Remote } from "../Remote"
import { GitHubProvider } from "./GitHubProvider"
import { UnsupportedProvider } from "./UnsupportedProvider"

export interface RemoteProvider {
  remote: Remote
  label: string

  // Get a URL for a commit.
  commitUrl(commit: Commit): vscode.Uri | null

  // Get a URL for a reference.
  referenceUrl(reference: string): vscode.Uri | null

  // Get a URL for a file at a commit.
  fileAtCommitUrl(commit: Commit, filename: string): vscode.Uri | null

  // Get a revision from a URI corresponding to this remote provider.
  //
  // This is generally going to handle URIs for resources that are opened by
  // official extension(s) for the remote provider.
  uriRevision(uri: vscode.Uri): string | null
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
