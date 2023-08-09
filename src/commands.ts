import * as vscode from "vscode"
import { basename } from "path"
import { PathContext } from "./types"
import { commitPaths, gitCommand, runCommandInTerminal } from "./util"

export const fileHistory = vscode.commands.registerTextEditorCommand(
  "gitterm.fileHistory",
  ({ document }: vscode.TextEditor) => {
    const path = vscode.workspace.asRelativePath(document.uri)
    const file = basename(path)
    const context: PathContext = { path, commitPaths: commitPaths(path) }

    runCommandInTerminal({
      name: `History: ${file}`,
      icon: "history",
      command: gitCommand("fileHistory", { path }),
      context,
    })
  },
)

export const lineHistory = vscode.commands.registerTextEditorCommand(
  "gitterm.lineHistory",
  ({ selection, document }: vscode.TextEditor) => {
    const startLine = selection.start.line + 1
    const endLine = selection.end.line + 1
    const lineRange = `${startLine},${endLine}`
    const lineSuffix = startLine === endLine ? startLine : lineRange

    const path = vscode.workspace.asRelativePath(document.uri)
    const file = basename(path)
    const context: PathContext = { path, commitPaths: commitPaths(path) }

    runCommandInTerminal({
      name: `History: ${file}:${lineSuffix}`,
      icon: "history",
      command: gitCommand("lineHistory", { path, startLine, endLine }),
      context,
    })
  },
)

export const fileBlame = vscode.commands.registerTextEditorCommand(
  "gitterm.fileBlame",
  ({ document }: vscode.TextEditor) => {
    const path = vscode.workspace.asRelativePath(document.uri)
    const file = basename(path)
    const context: PathContext = { path, commitPaths: commitPaths(path) }

    runCommandInTerminal({
      name: `Blame: ${file}`,
      icon: "person",
      command: gitCommand("fileBlame", { path }),
      context,
    })
  },
)
