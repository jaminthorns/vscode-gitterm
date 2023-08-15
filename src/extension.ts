import * as vscode from "vscode"
import { fileBlame, fileHistory, lineHistory } from "./commands"
import FilenameStore from "./FilenameStore"
import { commitLinkProvider, fileLinkProvider } from "./linkProviders"
import { runCommand } from "./util"

export async function activate(context: vscode.ExtensionContext) {
  const gitDirRaw = await runCommand("git", ["rev-parse", "--git-common-dir"])
  const gitDir = vscode.Uri.parse(gitDirRaw)
  const filenameStore = new FilenameStore(gitDir)

  context.subscriptions.push(
    fileHistory(),
    lineHistory(),
    fileBlame(),
    commitLinkProvider(),
    fileLinkProvider(filenameStore),
  )
}

export function deactivate() {}
