import * as vscode from "vscode"

export default class TerminalWorkspaceFolderStore {
  workspaceFolders: Map<number, vscode.WorkspaceFolder>

  constructor() {
    this.workspaceFolders = new Map()
  }

  async addTerminal(terminal: vscode.Terminal) {
    const processId = await terminal.processId

    if (processId === undefined || "pty" in terminal.creationOptions) {
      return
    }

    const { cwd } = terminal.creationOptions
    const { activeTextEditor } = vscode.window
    const { workspaceFolders: wsFolders } = vscode.workspace

    let wsFolder: vscode.WorkspaceFolder | undefined

    // It's not straightforward to get a terminal's workspace folder directory,
    // so we take a conservative guessing approach
    if (cwd !== undefined) {
      const uri = typeof cwd === "string" ? vscode.Uri.file(cwd) : cwd
      wsFolder = vscode.workspace.getWorkspaceFolder(uri)
    } else if (activeTextEditor !== undefined) {
      const uri = activeTextEditor.document.uri
      wsFolder = vscode.workspace.getWorkspaceFolder(uri)
    } else if (wsFolders !== undefined && wsFolders.length === 1) {
      wsFolder = wsFolders[0]
    }

    // When we can't find a workspace folder for a terminal, we ignore it
    if (wsFolder !== undefined) {
      this.workspaceFolders.set(processId, wsFolder)
    }
  }

  async getWorkspaceFolder(
    terminal: vscode.Terminal,
  ): Promise<vscode.WorkspaceFolder | undefined> {
    const processId = await terminal.processId

    if (processId) {
      return this.workspaceFolders.get(processId)
    }
  }
}
