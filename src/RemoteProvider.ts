import * as vscode from "vscode"
import { Commit } from "./Commit"
import { Remote } from "./Remote"

export interface RemoteProvider {
  remote: Remote
  label: string
  commitUrl(commit: Commit): vscode.Uri | null
  referenceUrl(reference: string): vscode.Uri | null
  fileAtCommitUrl(commit: Commit, filename: string): vscode.Uri | null
}

export function RemoteProvider(remote: Remote): RemoteProvider {
  switch (remote.server.host) {
    case "github.com":
      return GitHubProvider(remote)
    default:
      return UnsupportedProvider(remote)
  }
}

function GitHubProvider(remote: Remote): RemoteProvider {
  const pathPattern = /^(?<user>.+)\/(?<repository>.+)\.git$/
  const pathMatch = pathPattern.exec(remote.path)
  const user = pathMatch?.groups?.user ?? null
  const repository = pathMatch?.groups?.repository ?? null

  function url(path: string): vscode.Uri | null {
    if (user === null || repository === null) {
      const message = `Can't parse GitHub remote path: ${remote.path}`
      vscode.window.showErrorMessage(message)

      return null
    } else {
      const url = vscode.Uri.from({
        scheme: "https",
        authority: remote.server.host,
        path: `${user}/${repository}${path}`,
      })

      return url
    }
  }

  return {
    remote,
    label: `${remote.name} (GitHub)`,

    commitUrl(commit) {
      return url(`/commit/${commit.full}`)
    },

    referenceUrl(reference) {
      return url(`/tree/${reference}`)
    },

    fileAtCommitUrl(commit, filename) {
      return url(`/blob/${commit.full}/${filename}`)
    },
  }
}

function UnsupportedProvider(remote: Remote): RemoteProvider {
  function showNotSupportedMessage() {
    const message = `Remote server not supported: ${remote.server.host}`
    vscode.window.showErrorMessage(message)
  }

  return {
    remote,
    label: `${remote.name} (Unsupported)`,

    commitUrl() {
      showNotSupportedMessage()
      return null
    },

    referenceUrl() {
      showNotSupportedMessage()
      return null
    },

    fileAtCommitUrl() {
      showNotSupportedMessage()
      return null
    },
  }
}
