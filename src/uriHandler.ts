import * as vscode from "vscode"

export function uriHandler(): vscode.Disposable {
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
      const lineNumber = line === "" ? null : parseInt(line) - 1

      const gitUri = vscode.Uri.from({
        scheme: "git",
        path,
        query: JSON.stringify({ path, ref }),
      })

      const editor = await vscode.window.showTextDocument(gitUri)

      if (lineNumber !== null) {
        const position = new vscode.Position(lineNumber, 0)

        editor.selection = new vscode.Selection(position, position)
        editor.revealRange(new vscode.Range(position, position))
      }
    },
  })
}
