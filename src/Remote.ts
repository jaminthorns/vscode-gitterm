import * as vscode from "vscode"
import { runCommand } from "./util"

type Server =
  | { protocol: "ssh"; host: string; user: string }
  | { protocol: "http"; host: string }
  | { protocol: "https"; host: string }

export default interface Remote {
  name: string
  server: Server
  path: string
}

export default async function Remote(
  name: string,
  directory: vscode.Uri,
): Promise<Remote | null> {
  const urlRaw = await runCommand("git", ["remote", "get-url", name], directory)

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
