import * as vscode from "vscode"
import { ReferenceStore, createReferenceStore } from "./createReferenceStore"

export function LocalBranchStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
): ReferenceStore {
  return createReferenceStore({
    type: "localBranch",
    gitSubcommand: "branch",
    gitArgs: ["--format=%(refname:lstrip=2)"],
    debugFilePrefix: "local_branches",
    debugMessageLabel: "Local branches",
    directory,
    gitDirectory,
  })
}
