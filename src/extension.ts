import * as vscode from "vscode"
import { fileBlame, fileHistory, lineHistory } from "./commands"
import FilenameStore from "./FilenameStore"
import { commitLinkProvider, fileLinkProvider } from "./linkProviders"

export async function activate(context: vscode.ExtensionContext) {
  if (vscode.workspace.workspaceFolders !== undefined) {
    // TODO: Figure out how to handle multiple workspaces
    const workspaceFolder = vscode.workspace.workspaceFolders[0]
    const filenameStore = new FilenameStore(workspaceFolder)

    context.subscriptions.push(
      fileHistory(),
      lineHistory(),
      fileBlame(),
      commitLinkProvider(),
      fileLinkProvider(filenameStore),
    )
  }
}

export function deactivate() {}
