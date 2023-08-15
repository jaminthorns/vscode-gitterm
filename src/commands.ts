import { basename } from "path"
import * as vscode from "vscode"
import { TerminalFileContext } from "./types"
import { commitFilenames, gitCommand, runCommandInTerminal } from "./util"

export function fileHistory() {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.fileHistory",
    ({ document }: vscode.TextEditor) => {
      const filename = vscode.workspace.asRelativePath(document.uri)
      const context: TerminalFileContext = {
        filename,
        commitFilenames: commitFilenames(filename),
      }

      runCommandInTerminal({
        name: `History: ${basename(filename)}`,
        icon: "history",
        command: gitCommand("fileHistory", { filename }),
        context,
      })
    },
  )
}

export function lineHistory() {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.lineHistory",
    ({ selection, document }: vscode.TextEditor) => {
      const startLine = selection.start.line + 1
      const endLine = selection.end.line + 1
      const lineRange = `${startLine},${endLine}`
      const lineSuffix = startLine === endLine ? startLine : lineRange

      const filename = vscode.workspace.asRelativePath(document.uri)
      const context: TerminalFileContext = {
        filename,
        commitFilenames: commitFilenames(filename),
      }

      runCommandInTerminal({
        name: `History: ${basename(filename)}:${lineSuffix}`,
        icon: "history",
        command: gitCommand("lineHistory", { filename, startLine, endLine }),
        context,
      })
    },
  )
}

export function fileBlame() {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.fileBlame",
    ({ document }: vscode.TextEditor) => {
      const filename = vscode.workspace.asRelativePath(document.uri)
      const context: TerminalFileContext = {
        filename,
        commitFilenames: commitFilenames(filename),
      }

      runCommandInTerminal({
        name: `Blame: ${basename(filename)}`,
        icon: "person",
        command: gitCommand("fileBlame", { filename }),
        context,
      })
    },
  )
}
