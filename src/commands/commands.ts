import * as vscode from "vscode"
import { showCommitActions } from "../actions"
import { Commit } from "../Commit"
import { LineRange } from "../LineTranslator"
import { RepositoryStore } from "../stores"
import { uriRevision } from "../util"
import { fileAtReference } from "./fileAtReference"
import { fileBlame } from "./fileBlame"
import { fileHistory } from "./fileHistory"
import { folderHistory } from "./folderHistory"
import { lineBlame } from "./lineBlame"
import { lineHistory } from "./lineHistory"
import { stringSearch } from "./stringSearch"

interface LineNumberHandlerArgs {
  uri: vscode.Uri
  lineNumber: number
}

export function folderHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitsquatch.folderHistory",
    (uri: vscode.Uri) => {
      folderHistory(uri, repositories)
    },
  )
}

export function fileHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitsquatch.fileHistory",
    (uri: vscode.Uri) => {
      fileHistory(uri, repositories)
    },
  )
}

export function fileBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitsquatch.fileBlame",
    (uri: vscode.Uri) => {
      fileBlame(uri, repositories)
    },
  )
}

export function fileAtReferenceCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitsquatch.fileAtReference",
    (uri: vscode.Uri) => {
      fileAtReference(uri, repositories)
    },
  )
}

export function lineHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitsquatch.lineHistory",
    async ({ uri, lineNumber }: LineNumberHandlerArgs) => {
      const document = await vscode.workspace.openTextDocument(uri)
      const range = { start: lineNumber, end: lineNumber }

      lineHistory(document, [range], repositories)
    },
  )
}

export function lineBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitsquatch.lineBlame",
    async ({ uri, lineNumber }: LineNumberHandlerArgs) => {
      const document = await vscode.workspace.openTextDocument(uri)
      const range = { start: lineNumber, end: lineNumber }

      lineBlame(document, [range], repositories)
    },
  )
}

export function activeFileHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitsquatch.activeFileHistory",
    ({ document }: vscode.TextEditor) => {
      fileHistory(document.uri, repositories)
    },
  )
}

export function activeFileBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitsquatch.activeFileBlame",
    ({ document }: vscode.TextEditor) => {
      fileBlame(document.uri, repositories)
    },
  )
}

export function activeFileAtReferenceCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitsquatch.activeFileAtReference",
    ({ document }: vscode.TextEditor) => {
      fileAtReference(document.uri, repositories)
    },
  )
}

export function selectionHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitsquatch.selectionHistory",
    ({ document, selections }: vscode.TextEditor) => {
      const ranges = selections.map(selectionToRange)

      lineHistory(document, ranges, repositories)
    },
  )
}

export function selectionBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitsquatch.selectionBlame",
    ({ document, selections }: vscode.TextEditor) => {
      const ranges = selections.map(selectionToRange)

      lineBlame(document, ranges, repositories)
    },
  )
}

export function selectionSearchCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitsquatch.selectionSearch",
    ({ document, selections }: vscode.TextEditor) => {
      stringSearch(document, selections, repositories)
    },
  )
}

function selectionToRange({ start, end }: vscode.Selection): LineRange {
  return { start: start.line + 1, end: end.line + 1 }
}

export function showCommitActionsCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitsquatch.showCommitActions",
    async (uri: vscode.Uri) => {
      const repository = repositories.getRepository(uri)

      if (repository === undefined) {
        return
      }

      const revision = uriRevision(uri)
      const commit = await Commit(revision, repository.directory)

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

interface StoreItem extends vscode.QuickPickItem {
  value: "filenames" | "localBranches" | "remoteBranches" | "tags"
}

export function debugStoresCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitsquatch.debugStores", async () => {
    const selected = await vscode.window.showQuickPick<StoreItem>(
      [
        { value: "filenames", label: "Filenames" },
        { value: "localBranches", label: "Local Branches" },
        { value: "remoteBranches", label: "Remote Branches" },
        { value: "tags", label: "Tags" },
      ],
      { placeHolder: "Select stores to debug", canPickMany: true },
    )

    if (selected === undefined) {
      return
    }

    repositories.allRepositories().forEach((repository) => {
      selected.forEach(({ value }) => {
        repository[value].writeToFile()
      })
    })
  })
}
