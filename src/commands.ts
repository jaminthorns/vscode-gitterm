import { basename } from "path"
import * as vscode from "vscode"
import RepositoryStore from "./RepositoryStore"
import { FileContext, LineContext, TerminalFileContext } from "./types"
import { commitFilenames, gitCommand, runCommandInTerminal } from "./util"

export function fileHistory(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.fileHistory",
    ({ document }: vscode.TextEditor) => {
      const repository = repositories.getRepository(document.uri)

      if (repository === undefined) {
        return
      }

      const filename = vscode.workspace.asRelativePath(document.uri, false)
      const commandContext: FileContext = { filename }
      const terminalContext: TerminalFileContext = {
        filename,
        commitFilenames: commitFilenames(filename, repository.directory),
      }

      runCommandInTerminal({
        name: `History: ${basename(filename)}`,
        icon: "history",
        cwd: repository.directory,
        command: gitCommand("fileHistory", commandContext),
        context: terminalContext,
      })
    },
  )
}

export function lineHistory(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.lineHistory",
    ({ selection, document }: vscode.TextEditor) => {
      const repository = repositories.getRepository(document.uri)

      if (repository === undefined) {
        return
      }

      const startLine = selection.start.line + 1
      const endLine = selection.end.line + 1
      const lineRange = `${startLine},${endLine}`
      const lineSuffix = startLine === endLine ? startLine : lineRange

      const filename = vscode.workspace.asRelativePath(document.uri, false)
      const commandContext: LineContext = { filename, startLine, endLine }
      const terminalContext: TerminalFileContext = {
        filename,
        commitFilenames: commitFilenames(filename, repository.directory),
      }

      runCommandInTerminal({
        name: `History: ${basename(filename)}:${lineSuffix}`,
        icon: "history",
        cwd: repository.directory,
        command: gitCommand("lineHistory", commandContext),
        context: terminalContext,
      })
    },
  )
}

export function fileBlame(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.fileBlame",
    ({ document }: vscode.TextEditor) => {
      const repository = repositories.getRepository(document.uri)

      if (repository === undefined) {
        return
      }

      const filename = vscode.workspace.asRelativePath(document.uri, false)
      const context: TerminalFileContext = {
        filename,
        commitFilenames: commitFilenames(filename, repository.directory),
      }

      runCommandInTerminal({
        name: `Blame: ${basename(filename)}`,
        icon: "person",
        cwd: repository.directory,
        command: gitCommand("fileBlame", { filename }),
        context,
      })
    },
  )
}
