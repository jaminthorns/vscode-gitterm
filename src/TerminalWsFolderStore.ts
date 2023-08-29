import * as vscode from "vscode"

export default interface TerminalWsFolderStore {
  addTerminal(terminal: vscode.Terminal): Promise<void>
  removeTerminal(terminal: vscode.Terminal): Promise<void>
  getWorkspaceFolder(
    terminal: vscode.Terminal,
  ): Promise<vscode.WorkspaceFolder | undefined>
}

export default function TerminalWsFolderStore(): TerminalWsFolderStore {
  const workspaceFolders: Map<number, vscode.WorkspaceFolder> = new Map()

  return {
    async addTerminal(terminal) {
      const processId = await terminal.processId

      if (processId === undefined || "pty" in terminal.creationOptions) {
        return
      }

      const { cwd } = terminal.creationOptions
      const { activeTextEditor } = vscode.window
      const { workspaceFolders: wsFolders } = vscode.workspace

      let wsFolder: vscode.WorkspaceFolder | undefined

      // It's not straightforward to get a terminal's workspace folder
      // directory, so we take a conservative guessing approach
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
        workspaceFolders.set(processId, wsFolder)
      }
    },

    async removeTerminal(terminal) {
      const processId = await terminal.processId

      if (processId) {
        workspaceFolders.delete(processId)
      }
    },

    async getWorkspaceFolder(
      terminal: vscode.Terminal,
    ): Promise<vscode.WorkspaceFolder | undefined> {
      const processId = await terminal.processId

      if (processId) {
        return workspaceFolders.get(processId)
      }
    },
  }
}
