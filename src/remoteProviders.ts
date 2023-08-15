import * as vscode from "vscode"
import { Commit } from "./types"
import { excludeNulls, runCommand } from "./util"

export type Server =
  | { protocol: "ssh"; host: string; user: string }
  | { protocol: "http"; host: string }
  | { protocol: "https"; host: string }

export interface Remote {
  name: string
  server: Server
  path: string
}

export interface RemoteProvider {
  remote: Remote

  get label(): string
  commitUrl(commit: Commit): vscode.Uri
  fileAtCommitUrl(commit: Commit, filename: string): vscode.Uri
}

// TODO: Handle unsupported providers better (currently just ignoring)
export async function getRemotes(): Promise<RemoteProvider[]> {
  const output = await runCommand("git", ["remote"])
  const names = output === "" ? [] : output.split("\n")
  const remotes = excludeNulls(await Promise.all(names.map(getRemote)))
  const providers = excludeNulls(remotes.map(matchProvider))

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

async function getRemote(name: string): Promise<Remote | null> {
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

function matchProvider(remote: Remote): RemoteProvider | null {
  switch (remote.server.host) {
    case "github.com":
      return new GitHubProvider(remote)
    default:
      return null
  }
}

class GitHubProvider implements RemoteProvider {
  remote: Remote
  user: string
  repository: string

  constructor(remote: Remote) {
    this.remote = remote

    const pathPattern = /^(?<user>.+)\/(?<repository>.+)\.git$/
    const pathMatch = pathPattern.exec(remote.path)

    if (pathMatch !== null) {
      const groups = pathMatch.groups || {}

      this.user = groups.user
      this.repository = groups.repository
    } else {
      throw new Error("Could not parse user and repository from GitHub URL")
    }
  }

  get label() {
    return `${this.remote.name} (GitHub)`
  }

  commitUrl(commit: Commit) {
    return this.#baseUrl(`/commit/${commit.full}`)
  }

  fileAtCommitUrl(commit: Commit, filename: string) {
    return this.#baseUrl(`/blob/${commit.full}/${filename}`)
  }

  #baseUrl(path: string): vscode.Uri {
    return vscode.Uri.from({
      scheme: "https",
      authority: this.remote.server.host,
      path: `${this.user}/${this.repository}${path}`,
    })
  }
}
