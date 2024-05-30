import * as vscode from "vscode"
import { showCommitActions } from "../actions"
import { Commit } from "../Commit"
import { RepositoryStore } from "../stores"
import { Range } from "./common"
import { fileBlame } from "./fileBlame"
import { fileHistory } from "./fileHistory"
import { folderHistory } from "./folderHistory"
import { lineBlame } from "./lineBlame"
import { lineHistory } from "./lineHistory"

interface LineNumberHandlerArgs {
  uri: vscode.Uri
  lineNumber: number
}

export function folderHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.folderHistory",
    (uri: vscode.Uri) => {
      folderHistory(uri, repositories)
    },
  )
}

export function fileHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.fileHistory",
    (uri: vscode.Uri) => {
      fileHistory(uri, repositories)
    },
  )
}

export function fileBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.fileBlame",
    (uri: vscode.Uri) => {
      fileBlame(uri, repositories)
    },
  )
}

export function lineHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.lineHistory",
    async ({ uri, lineNumber }: LineNumberHandlerArgs) => {
      const document = await vscode.workspace.openTextDocument(uri)
      const range = { start: lineNumber, end: lineNumber }

      lineHistory(document, [range], repositories)
    },
  )
}

export function lineBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.lineBlame",
    async ({ uri, lineNumber }: LineNumberHandlerArgs) => {
      const document = await vscode.workspace.openTextDocument(uri)
      const range = { start: lineNumber, end: lineNumber }

      lineBlame(document, [range], repositories)
    },
  )
}

export function activeFileHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.activeFileHistory",
    ({ document }: vscode.TextEditor) => {
      fileHistory(document.uri, repositories)
    },
  )
}

export function activeFileBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.activeFileBlame",
    ({ document }: vscode.TextEditor) => {
      fileBlame(document.uri, repositories)
    },
  )
}

export function selectionHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.selectionHistory",
    ({ document, selections }: vscode.TextEditor) => {
      const ranges = selections.map(selectionToRange)

      lineHistory(document, ranges, repositories)
    },
  )
}

export function selectionBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.selectionBlame",
    ({ document, selections }: vscode.TextEditor) => {
      const ranges = selections.map(selectionToRange)

      lineBlame(document, ranges, repositories)
    },
  )
}

function selectionToRange({ start, end }: vscode.Selection): Range {
  return { start: start.line + 1, end: end.line + 1 }
}

export function showCommitActionsCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.showCommitActions",
    async (uri: vscode.Uri) => {
      const repository = repositories.getRepository(uri)

      if (repository === undefined) {
        return
      }

      const { ref } = JSON.parse(uri.query) as { ref: string }
      const commit = await Commit(ref, repository.directory)

      if (commit === null) {
        return
      }

      const fileUri = vscode.Uri.file(uri.path)
      const filename =
        uri.scheme === "git"
          ? vscode.workspace.asRelativePath(fileUri, false)
          : undefined

      await showCommitActions(repository, commit, filename)
    },
  )
}
