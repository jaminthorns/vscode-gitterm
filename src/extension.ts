import * as vscode from "vscode"
import {
  activeFileBlameCommand,
  activeFileHistoryCommand,
  debugFilenamesCommand,
  debugReferencesCommand,
  fileBlameCommand,
  fileHistoryCommand,
  folderHistoryCommand,
  lineBlameCommand,
  lineHistoryCommand,
  selectionBlameCommand,
  selectionHistoryCommand,
  showCommitActionsCommand,
} from "./commands"
import {
  commitLinkProvider,
  fileLinkProvider,
  referenceLinkProvider,
  reflogLinkProvider,
} from "./linkProviders"
import { RepositoryStore, TerminalFolderStore } from "./stores"

export function activate(context: vscode.ExtensionContext) {
  const { workspaceFolders } = vscode.workspace

  if (workspaceFolders === undefined) {
    return
  }

  const repositories = setupRepositories(workspaceFolders)
  const terminalFolders = setupTerminalFolders()

  context.subscriptions.push(
    // Commands
    folderHistoryCommand(repositories),
    fileHistoryCommand(repositories),
    fileBlameCommand(repositories),
    lineHistoryCommand(repositories),
    lineBlameCommand(repositories),
    activeFileHistoryCommand(repositories),
    activeFileBlameCommand(repositories),
    selectionHistoryCommand(repositories),
    selectionBlameCommand(repositories),
    showCommitActionsCommand(repositories),
    debugFilenamesCommand(repositories),
    debugReferencesCommand(repositories),

    // Link providers
    commitLinkProvider(repositories, terminalFolders),
    fileLinkProvider(repositories, terminalFolders),
    referenceLinkProvider(repositories, terminalFolders),
    reflogLinkProvider(repositories, terminalFolders),
  )
}

// TODO: Account for workspace folders without Git repositories.
function setupRepositories(
  workspaceFolders: readonly vscode.WorkspaceFolder[],
): RepositoryStore {
  const repositories = RepositoryStore()

  workspaceFolders.forEach(repositories.addRepository)

  vscode.workspace.onDidChangeWorkspaceFolders(({ added, removed }) => {
    added.forEach(repositories.addRepository)
    removed.forEach(repositories.removeRepository)
  })

  return repositories
}

function setupTerminalFolders(): TerminalFolderStore {
  const terminalFolders = TerminalFolderStore()

  vscode.window.terminals.forEach(terminalFolders.addFolder)
  vscode.window.onDidOpenTerminal(terminalFolders.addFolder)
  vscode.window.onDidCloseTerminal(terminalFolders.removeFolder)

  return terminalFolders
}

export function deactivate() {}
