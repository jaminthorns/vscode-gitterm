import * as vscode from "vscode"

export default interface TerminalFolderStore {
  addFolder(terminal: vscode.Terminal): Promise<void>
  removeFolder(terminal: vscode.Terminal): Promise<void>
  getFolder(
    terminal: vscode.Terminal,
  ): Promise<vscode.WorkspaceFolder | undefined>
}

export default function TerminalFolderStore(): TerminalFolderStore {
  const workspaceFolders: Map<number, vscode.WorkspaceFolder> = new Map()

  return {
    async addFolder(terminal) {
      const processId = await terminal.processId

      if (processId === undefined || "pty" in terminal.creationOptions) {
        return
      }

      const { cwd } = terminal.creationOptions
      const { activeTextEditor } = vscode.window
      const { workspaceFolders: folders } = vscode.workspace

      let folder: vscode.WorkspaceFolder | undefined

      // It's not straightforward to get a terminal's workspace folder
      // directory, so we take a conservative guessing approach
      if (cwd !== undefined) {
        const uri = typeof cwd === "string" ? vscode.Uri.file(cwd) : cwd
        folder = vscode.workspace.getWorkspaceFolder(uri)
      } else if (activeTextEditor !== undefined) {
        const uri = activeTextEditor.document.uri
        folder = vscode.workspace.getWorkspaceFolder(uri)
      } else if (folders !== undefined && folders.length === 1) {
        folder = folders[0]
      }

      // When we can't find a workspace folder for a terminal, we ignore it
      if (folder !== undefined) {
        workspaceFolders.set(processId, folder)
      }
    },

    async removeFolder(terminal) {
      const processId = await terminal.processId

      if (processId) {
        workspaceFolders.delete(processId)
      }
    },

    async getFolder(
      terminal: vscode.Terminal,
    ): Promise<vscode.WorkspaceFolder | undefined> {
      const processId = await terminal.processId

      if (processId) {
        return workspaceFolders.get(processId)
      }
    },
  }
}
