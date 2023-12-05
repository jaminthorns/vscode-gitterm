import { lookpath } from "lookpath"
import * as vscode from "vscode"
import { run } from "./util"

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

      if (cwd !== undefined) {
        // If the cwd is explicitly given, then use it
        const uri = typeof cwd === "string" ? vscode.Uri.file(cwd) : cwd
        folder = vscode.workspace.getWorkspaceFolder(uri)
      } else if (folders !== undefined && folders.length === 1) {
        // If there is only 1 folder, then it's the only reasonable choice
        folder = folders[0]
      } else if ((await lookpath("lsof")) !== undefined) {
        // We can detect the cwd using the `lsof` command when available
        const uri = vscode.Uri.file(await lsofCwd(processId))
        folder = vscode.workspace.getWorkspaceFolder(uri)
      } else if (activeTextEditor !== undefined) {
        // VS Code's behavior is to spawn new terminals in the active editor's
        // folder, so this is a decent guess
        const uri = activeTextEditor.document.uri
        folder = vscode.workspace.getWorkspaceFolder(uri)
      }

      // When we can't find a folder for a terminal, we ignore it
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

async function lsofCwd(pid: number): Promise<string> {
  const args = ["-a", "-d", "cwd", "-Fn", "-p", pid.toString()]
  const output = await run("lsof", args)

  return output.split("\n")[2].slice(1)
}
