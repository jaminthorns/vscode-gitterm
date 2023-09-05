import * as vscode from "vscode"
import { Commit } from "./Commit"
import Remote from "./Remote"
import { excludeNulls, runGitCommand } from "./util"

export default interface RemoteProvider {
  remote: Remote
  label: string
  openCommit(commit: Commit): void
  openFileAtCommit(commit: Commit, filename: string): void
}

function RemoteProvider(remote: Remote): RemoteProvider {
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

export async function createRemoteProviders(
  directory: vscode.Uri,
): Promise<RemoteProvider[]> {
  const output = await runGitCommand("remote", directory, [])
  const names = output === "" ? [] : output.split("\n")
  const remotes = await Promise.all(names.map((n) => Remote(n, directory)))
  const providers = excludeNulls(remotes).map(RemoteProvider)

  // Show "origin" remote at the top
  providers.sort((a, b) => {
    switch (true) {
      case a.remote.name === "origin":
        return -1
      case b.remote.name === "origin":
        return 1
      default:
        return 0
    }
  })

  return providers
}
