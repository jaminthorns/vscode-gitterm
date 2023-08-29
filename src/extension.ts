import * as vscode from "vscode"
import { fileBlame, fileHistory, lineHistory } from "./commands"
import FilenameStore, { createFilenameStore } from "./FilenameStore"
import { commitLinkProvider, fileLinkProvider } from "./linkProviders"
import { createRemoteProviders } from "./RemoteProvider"
import TerminalWorkspaceFolderStore from "./TerminalWorkspaceFolderStore"
import { runCommand } from "./util"

export async function activate(context: vscode.ExtensionContext) {
  const terminalWorkspaceFolderStore = setupTerminalWorkspaceFolderStore()

  const [remotes, filenameStore] = await Promise.all([
    await createRemoteProviders(),
    await setupFilenameStore(),
  ])

  context.subscriptions.push(
    fileHistory(),
    lineHistory(),
    fileBlame(),
    commitLinkProvider(remotes),
    fileLinkProvider(filenameStore),
  )
}

function setupTerminalWorkspaceFolderStore(): TerminalWorkspaceFolderStore {
  const terminalWorkspaceFolders = new TerminalWorkspaceFolderStore()

  vscode.window.terminals.forEach((terminal) => {
    terminalWorkspaceFolders.addTerminal(terminal)
  })

  vscode.window.onDidOpenTerminal((terminal) => {
    terminalWorkspaceFolders.addTerminal(terminal)
  })

  return terminalWorkspaceFolders
}

async function setupFilenameStore(): Promise<FilenameStore> {
  const gitDirRaw = await runCommand("git", ["rev-parse", "--git-common-dir"])
  const gitDir = vscode.Uri.parse(gitDirRaw)

  return createFilenameStore(gitDir)
}

export function deactivate() {}
