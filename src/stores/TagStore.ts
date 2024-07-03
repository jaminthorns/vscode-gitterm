import * as vscode from "vscode"
import { ReferenceStore, createReferenceStore } from "./createReferenceStore"

export function TagStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
): ReferenceStore {
  return createReferenceStore({
    type: "tag",
    gitSubcommand: "tag",
    gitArgs: ["--format=%(refname:lstrip=2)"],
    debugFilePrefix: "tags",
    debugMessageLabel: "Tags",
    directory,
    gitDirectory,
  })
}
