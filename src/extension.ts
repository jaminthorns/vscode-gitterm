import * as vscode from "vscode"
import { fileBlame, fileHistory, lineHistory } from "./commands"
import FilenameStore, { createFilenameStore } from "./FilenameStore"
import { commitLinkProvider, fileLinkProvider } from "./linkProviders"
import { createRemoteProviders } from "./RemoteProvider"
import TerminalWsFolderStore, {
  createTerminalWsFolderStore,
} from "./TerminalWsFolderStore"
import { runCommand } from "./util"

export async function activate(context: vscode.ExtensionContext) {
  const terminalWsFolders = setupTerminalWsFolders()

  const [remotes, filenames] = await Promise.all([
    await createRemoteProviders(),
    await setupFilenames(),
  ])

  context.subscriptions.push(
    fileHistory(),
    lineHistory(),
    fileBlame(),
    commitLinkProvider(remotes),
    fileLinkProvider(filenames),
  )
}

function setupTerminalWsFolders(): TerminalWsFolderStore {
  const terminalWsFolders = createTerminalWsFolderStore()

  vscode.window.terminals.forEach(terminalWsFolders.addTerminal)
  vscode.window.onDidOpenTerminal(terminalWsFolders.addTerminal)
  vscode.window.onDidCloseTerminal(terminalWsFolders.removeTerminal)

  return terminalWsFolders
}

async function setupFilenames(): Promise<FilenameStore> {
  const gitDirRaw = await runCommand("git", ["rev-parse", "--git-common-dir"])
  const gitDir = vscode.Uri.parse(gitDirRaw)

  return createFilenameStore(gitDir)
}

export function deactivate() {}
