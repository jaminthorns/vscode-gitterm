import * as vscode from "vscode"
import { Commit } from "./types"
import { excludeNulls, runCommand } from "./util"

type Server =
  | { protocol: "ssh"; host: string; user: string }
  | { protocol: "http"; host: string }
  | { protocol: "https"; host: string }

interface Remote {
  name: string
  server: Server
  path: string
}

export default interface RemoteProvider {
  remote: Remote
  label: string
  commitUrl(commit: Commit): vscode.Uri
  fileAtCommitUrl(commit: Commit, filename: string): vscode.Uri
}

// TODO: Handle unsupported providers better (currently just ignoring)
export async function createRemoteProviders(): Promise<RemoteProvider[]> {
  const output = await runCommand("git", ["remote"])
  const names = output === "" ? [] : output.split("\n")
  const remotes = excludeNulls(await Promise.all(names.map(createRemote)))
  const providers = excludeNulls(remotes.map(createRemoteProvider))

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

async function createRemote(name: string): Promise<Remote | null> {
  const urlRaw = await runCommand("git", ["remote", "get-url", name])

  const sshPattern =
    /^(?!http)(?:ssh:\/\/)?(?:(?<user>.+)@)?(?<host>.+):(?<path>.*)$/
  const sshMatch = sshPattern.exec(urlRaw)

  const httpPattern = /^(?<protocol>https?):\/\/(?<host>[^/]+)\/(?<path>.*)$/
  const httpMatch = httpPattern.exec(urlRaw)

  if (sshMatch !== null) {
    const { user, host, path } = sshMatch.groups || {}
    return { name, path, server: { protocol: "ssh", host, user } }
  } else if (httpMatch !== null) {
    const { protocol, host, path } = httpMatch.groups || {}
    return { name, path, server: { protocol, host } } as Remote
  } else {
    return null
  }
}

function createRemoteProvider(remote: Remote): RemoteProvider | null {
  switch (remote.server.host) {
    case "github.com":
      return createGitHub(remote)
    default:
      return null
  }
}

function createGitHub(remote: Remote): RemoteProvider | null {
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
