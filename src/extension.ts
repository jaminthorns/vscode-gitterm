import * as vscode from "vscode"
import {
  activeFileAtReferenceCommand,
  activeFileBlameCommand,
  activeFileHistoryCommand,
  debugStoresCommand,
  fileAtReferenceCommand,
  fileBlameCommand,
  fileHistoryCommand,
  folderHistoryCommand,
  lineBlameCommand,
  lineHistoryCommand,
  selectionBlameCommand,
  selectionHistoryCommand,
  selectionSearchCommand,
  showCommitActionsCommand,
} from "./commands"
import { fileAtCommitLineProvider } from "./definitionProviders/fileAtCommitLineProvider"
import { RepositoryStore, TerminalFolderStore } from "./stores"
import { terminalLinkProvider } from "./terminalLinkProvider"
import { uriHandler } from "./uriHandler"
import { filterAsync, git } from "./util"

export async function activate(context: vscode.ExtensionContext) {
  const { workspaceFolders } = vscode.workspace

  if (workspaceFolders === undefined) {
    return
  }

  const repositories = await setupRepositories(workspaceFolders)
  const terminalFolders = setupTerminalFolders()

  context.subscriptions.push(
    // Commands
    folderHistoryCommand(repositories),
    fileHistoryCommand(repositories),
    fileBlameCommand(repositories),
    fileAtReferenceCommand(repositories),
    lineHistoryCommand(repositories),
    lineBlameCommand(repositories),
    activeFileHistoryCommand(repositories),
    activeFileBlameCommand(repositories),
    activeFileAtReferenceCommand(repositories),
    selectionHistoryCommand(repositories),
    selectionBlameCommand(repositories),
    showCommitActionsCommand(repositories),
    selectionSearchCommand(repositories),
    debugStoresCommand(repositories),

    // Terminal link provider
    terminalLinkProvider(repositories, terminalFolders),

    // URI handler
    uriHandler(repositories),

    // Definition providers
    fileAtCommitLineProvider(repositories),
  )
}

async function setupRepositories(
  workspaceFolders: readonly vscode.WorkspaceFolder[],
): Promise<RepositoryStore> {
  const repositories = RepositoryStore()

  vscode.workspace.onDidChangeWorkspaceFolders(async ({ added, removed }) => {
    const [addedWithRepo, removedWithRepo] = await Promise.all([
      filterAsync(added, inRepository),
      filterAsync(removed, inRepository),
    ])

    addedWithRepo.forEach(repositories.addRepository)
    removedWithRepo.forEach(repositories.removeRepository)
  })

  const foldersWithRepo = await filterAsync(workspaceFolders, inRepository)
  foldersWithRepo.forEach(repositories.addRepository)

  return repositories
}

async function inRepository(workspaceFolder: vscode.WorkspaceFolder) {
  try {
    const result = await git("rev-parse", ["--is-inside-work-tree"], {
      directory: workspaceFolder.uri,
    })

    return result === "true"
  } catch (error) {
    return false
  }
}

function setupTerminalFolders(): TerminalFolderStore {
  const terminalFolders = TerminalFolderStore()

  vscode.window.terminals.forEach(terminalFolders.addFolder)
  vscode.window.onDidOpenTerminal(terminalFolders.addFolder)
  vscode.window.onDidCloseTerminal(terminalFolders.removeFolder)

  return terminalFolders
}

export function deactivate() {}
