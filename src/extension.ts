import * as vscode from "vscode"
import { fileBlame, fileHistory, lineHistory } from "./commands"
import { commitLinkProvider } from "./linkProviders"

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    fileHistory,
    lineHistory,
    fileBlame,
    commitLinkProvider,
  )
}

export function deactivate() {}
