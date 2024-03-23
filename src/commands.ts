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

interface LineNumberHandlerArgs {
  uri: vscode.Uri
  lineNumber: number
}

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

export function lineHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.lineHistory",
    async ({ uri, lineNumber }: LineNumberHandlerArgs) => {
      // TODO: Handle Git URIs.
      const document = await vscode.workspace.openTextDocument(uri)
      lineHistory(document, lineNumber, lineNumber, repositories)
    },
  )
}

export function lineBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.lineBlame",
    async ({ uri, lineNumber }: LineNumberHandlerArgs) => {
      // TODO: Handle Git URIs.
      const document = await vscode.workspace.openTextDocument(uri)
      lineBlame(document, lineNumber, lineNumber, repositories)
    },
  )
}

export function activeFileHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.activeFileHistory",
    ({ document }: vscode.TextEditor) =>
      fileHistory(document.uri, repositories),
  )
}

export function activeFileBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.activeFileBlame",
    ({ document }: vscode.TextEditor) => fileBlame(document.uri, repositories),
  )
}

export function selectionHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.selectionHistory",
    ({ document, selection }: vscode.TextEditor) =>
      lineHistory(
        document,
        selection.start.line + 1,
        selection.end.line + 1,
        repositories,
      ),
  )
}

export function selectionBlameCommand(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.selectionBlame",
    ({ document, selection }: vscode.TextEditor) =>
      lineBlame(
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

  const { directory } = repository
  const folder = vscode.workspace.asRelativePath(uri, false)

  runCommandInTerminal({
    name: basename(folder),
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "folderHistory",
      variables: { folder, revision: "HEAD" },
    }),
    context: { folder },
  })
}

function fileHistory(uri: vscode.Uri, repositories: RepositoryStore) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(uri, false)

  runCommandInTerminal({
    name: basename(filename),
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "fileHistory",
      variables: { filename, revision: "HEAD" },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(filename, directory),
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

  const startLineHead = translateOldLine(startLine, "start", translators)
  const endLineHead = translateOldLine(endLine, "end", translators)

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
        revision: "HEAD",
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

function fileBlame(uri: vscode.Uri, repositories: RepositoryStore) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(uri, false)

  runCommandInTerminal({
    name: basename(filename),
    icon: "person",
    cwd: directory,
    command: userGitCommand({
      key: "fileBlame",
      variables: { filename },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(filename, directory),
    },
  })
}

async function lineBlame(
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

  const unsavedDiff = await lineTranslationDiff(
    ["--no-index", "--", filename, "-"],
    { directory, stdin: document.getText(), ignoreNonZeroExitCode: true },
  )

  const translators = [LineTranslator(unsavedDiff)]
  const startLineSaved = translateOldLine(startLine, "start", translators)
  const endLineSaved = translateOldLine(endLine, "end", translators)

  if (startLineSaved > endLineSaved) {
    const suffix = startLine === endLine ? "" : "s"
    const message = `Can't show blame for unsaved line${suffix}.`

    vscode.window.showInformationMessage(message)
    return
  }

  const lineRange = `${startLineSaved},${endLineSaved}`
  const lineSuffix =
    startLineSaved === endLineSaved ? startLineSaved : lineRange

  runCommandInTerminal({
    name: `${basename(filename)}:${lineSuffix}`,
    icon: "person",
    cwd: directory,
    command: userGitCommand({
      key: "lineBlame",
      variables: {
        filename,
        endLine: endLineSaved,
        startLine: startLineSaved,
      },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(filename, directory),
    },
  })
}

const translateOldLine = (
  line: number,
  bound: "start" | "end",
  translators: LineTranslator[],
) => {
  return translators.reduce((translated, t) => {
    const range = t.oldLine(translated)
    const newOffset = range.span === 0 && bound === "start" ? 1 : 0

    return range[bound] + newOffset
  }, line)
}
