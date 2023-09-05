import * as vscode from "vscode"
import { Commit } from "./Commit"
import Remote from "./Remote"
import { excludeNulls, runGitCommand } from "./util"

export default interface RemoteProvider {
  remote: Remote
  label: string
  commitUrl(commit: Commit): vscode.Uri
  fileAtCommitUrl(commit: Commit, filename: string): vscode.Uri
}

function RemoteProvider(remote: Remote): RemoteProvider | null {
  switch (remote.server.host) {
    case "github.com":
      return GitHubProvider(remote)
    default:
      return null
  }
}

function GitHubProvider(remote: Remote): RemoteProvider | null {
  const pathPattern = /^(?<user>.+)\/(?<repository>.+)\.git$/
  const pathMatch = pathPattern.exec(remote.path)

  if (pathMatch === null) {
    return null
  }

  const { user, repository } = pathMatch.groups || {}

  function baseUrl(path: string): vscode.Uri {
    return vscode.Uri.from({
      scheme: "https",
      authority: remote.server.host,
      path: `${user}/${repository}${path}`,
    })
  }

  return {
    remote,
    label: `${remote.name} (GitHub)`,

    commitUrl(commit) {
      return baseUrl(`/commit/${commit.full}`)
    },

    fileAtCommitUrl(commit, filename) {
      return baseUrl(`/blob/${commit.full}/${filename}`)
    },
  }
}

// TODO: Handle unsupported providers better (currently just ignoring)
export async function createRemoteProviders(
  directory: vscode.Uri,
): Promise<RemoteProvider[]> {
  const output = await runGitCommand("remote", directory, [])
  const names = output === "" ? [] : output.split("\n")
  const remotes = excludeNulls(
    await Promise.all(names.map((name) => Remote(name, directory))),
  )
  const providers = excludeNulls(remotes.map(RemoteProvider))

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
