import { basename } from "path"
import * as vscode from "vscode"
import { Commit } from "./Commit"
import { RepositoryStore } from "./stores"

export function uriHandler(repositories: RepositoryStore): vscode.Disposable {
  return vscode.window.registerUriHandler({
    handleUri: async (uri: vscode.Uri): Promise<void> => {
      const match = uri.path.match(/^\/(.*?):(.*?)(?::(\d*))?$/)

      if (match === null) {
        const uriFormat = `vscode://${uri.authority}/<COMMIT>:<PATH>:<LINE>`
        const message = `Invalid URI format, must be formatted like: ${uriFormat}`
        vscode.window.showErrorMessage(message)

        return
      }

      const [, ref, path, line = ""] = match

      const fileUri = vscode.Uri.file(path)
      const repository = repositories.getRepository(fileUri)

      if (repository === undefined) {
        return
      }

      const { directory } = repository
      const commit = await Commit(ref, directory)

      if (commit === null) {
        return
      }

      const gitUri = vscode.Uri.from({
        scheme: "git",
        path,
        query: JSON.stringify({ path, ref }),
      })

      const lineNumber = line === "" ? null : parseInt(line) - 1
      const selection =
        lineNumber === null
          ? undefined
          : new vscode.Range(lineNumber, 0, lineNumber, 0)

      const options = { selection }
      const label = `${basename(path)} (${commit.short})`

      vscode.commands.executeCommand("vscode.open", gitUri, options, label)
    },
  })
}
