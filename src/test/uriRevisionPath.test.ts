import { equal } from "assert/strict"
import * as vscode from "vscode"
import { uriRevisionPath } from "../util"

suite("uriRevisionPath for different schemes", () => {
  test("file scheme", () => {
    console.log("workspaceFolders", vscode.workspace.workspaceFolders)

    const uri = vscode.Uri.parse(
      "file:///Users/test/Projects/vscode-gitterm/README.md",
    )

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, "HEAD")
    equal(path, "README.md")
  })
})
