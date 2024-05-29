import * as vscode from "vscode"
import { Remote } from "../Remote"
import { RemoteProvider } from "./RemoteProvider"

export function GitHubProvider(remote: Remote): RemoteProvider {
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
