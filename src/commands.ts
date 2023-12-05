import { basename } from "path"
import * as vscode from "vscode"
import { LineTranslator } from "./LineTranslator"
import RepositoryStore from "./RepositoryStore"
import {
  commitFilenames,
  lineTranslationDiff,
  runCommandInTerminal,
  userGitCommand,
} from "./util"

export function folderHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.folderHistory",
    (uri: vscode.Uri) => folderHistory(uri, repositories),
  )
}

export function fileHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.fileHistory",
    (uri: vscode.Uri) => fileHistory(uri, repositories),
  )
}

export function fileBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.fileBlame",
    (uri: vscode.Uri) => fileBlame(uri, repositories),
  )
}

export function fileHistoryEditorCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.fileHistory.editor",
    ({ document }: vscode.TextEditor) =>
      fileHistory(document.uri, repositories),
  )
}

export function fileBlameEditorCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.fileBlame.editor",
    ({ document }: vscode.TextEditor) => fileBlame(document.uri, repositories),
  )
}

export function lineHistoryEditorCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.lineHistory.editor",
    ({ document, selection }: vscode.TextEditor) =>
      lineHistory(
        document,
        selection.start.line + 1,
        selection.end.line + 1,
        repositories,
      ),
  )
}

function folderHistory(uri: vscode.Uri, repositories: RepositoryStore) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const folder = vscode.workspace.asRelativePath(uri, false)

  runCommandInTerminal({
    name: basename(folder),
    icon: "history",
    cwd: repository.directory,
    command: userGitCommand({
      key: "folderHistory",
      variables: { folder, commit: "HEAD" },
    }),
    context: { folder },
  })
}

function fileHistory(uri: vscode.Uri, repositories: RepositoryStore) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const filename = vscode.workspace.asRelativePath(uri, false)

  runCommandInTerminal({
    name: basename(filename),
    icon: "history",
    cwd: repository.directory,
    command: userGitCommand({
      key: "fileHistory",
      variables: { filename, commit: "HEAD" },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(filename, repository.directory),
    },
  })
}

function fileBlame(uri: vscode.Uri, repositories: RepositoryStore) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const filename = vscode.workspace.asRelativePath(uri, false)

  runCommandInTerminal({
    name: basename(filename),
    icon: "person",
    cwd: repository.directory,
    command: userGitCommand({
      key: "fileBlame",
      variables: { filename },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(filename, repository.directory),
    },
  })
}

async function lineHistory(
  document: vscode.TextDocument,
  startLine: number,
  endLine: number,
  repositories: RepositoryStore,
) {
  const repository = repositories.getRepository(document.uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(document.uri, false)

  const [unsavedDiff, worktreeDiff, stagedDiff] = await Promise.all([
    lineTranslationDiff(["--no-index", "--", filename, "-"], {
      directory,
      stdin: document.getText(),
      ignoreNonZeroExitCode: true,
    }),
    lineTranslationDiff(["--", filename], { directory }),
    lineTranslationDiff(["--staged", "--", filename], { directory }),
  ])

  const translators = [
    LineTranslator(unsavedDiff),
    LineTranslator(worktreeDiff),
    LineTranslator(stagedDiff),
  ]

  const translateOldLine = (line: number, bound: "start" | "end") => {
    return translators.reduce((translated, t) => {
      const range = t.oldLine(translated)
      const newOffset = range.span === 0 && bound === "start" ? 1 : 0

      return range[bound] + newOffset
    }, line)
  }

  const startLineHead = translateOldLine(startLine, "start")
  const endLineHead = translateOldLine(endLine, "end")

  if (startLineHead > endLineHead) {
    const suffix = startLine === endLine ? "" : "s"
    const message = `Can't show history for newly added line${suffix}.`

    vscode.window.showInformationMessage(message)
    return
  }

  const lineRange = `${startLineHead},${endLineHead}`
  const lineSuffix = startLineHead === endLineHead ? startLineHead : lineRange

  runCommandInTerminal({
    name: `${basename(filename)}:${lineSuffix}`,
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "lineHistory",
      variables: {
        filename,
        commit: "HEAD",
        startLine: startLineHead,
        endLine: endLineHead,
      },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(filename, directory),
    },
  })
}
