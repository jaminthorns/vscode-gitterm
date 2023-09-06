import * as vscode from "vscode"
import { Commit } from "./Commit"
import Remote from "./Remote"

export default interface RemoteProvider {
  remote: Remote
  label: string
  openCommit(commit: Commit): void
  openFileAtCommit(commit: Commit, filename: string): void
}

export default function RemoteProvider(remote: Remote): RemoteProvider {
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

  function openUrl(path: string): void {
    if (user === null || repository === null) {
      const message = `Can't parse GitHub remote path: ${remote.path}`
      vscode.window.showErrorMessage(message)
    } else {
      const url = vscode.Uri.from({
        scheme: "https",
        authority: remote.server.host,
        path: `${user}/${repository}${path}`,
      })

      vscode.env.openExternal(url)
    }
  }

  return {
    remote,
    label: `${remote.name} (GitHub)`,

    openCommit(commit) {
      openUrl(`/commit/${commit.full}`)
    },

    openFileAtCommit(commit, filename) {
      openUrl(`/blob/${commit.full}/${filename}`)
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

    openCommit() {
      showNotSupportedMessage()
    },

    openFileAtCommit() {
      showNotSupportedMessage()
    },
  }
}
