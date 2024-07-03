import * as vscode from "vscode"
import { ReferenceStore, createReferenceStore } from "./createReferenceStore"

export function RemoteBranchStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
): ReferenceStore {
  return createReferenceStore({
    type: "remoteBranch",
    gitSubcommand: "branch",
    gitArgs: ["--remotes", "--format=%(refname:lstrip=2)"],
    debugFilePrefix: "remote_branches",
    debugMessageLabel: "Remote branches",
    directory,
    gitDirectory,
  })
}
