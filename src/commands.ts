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

interface Range {
  start: number
  end: number
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
      // TODO: Handle Git URIs.
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
      // TODO: Handle Git URIs.
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
  ranges: Range[],
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

  const headRanges = ranges.map(({ start, end }) => ({
    start: translateOldLine(start, "start", translators),
    end: translateOldLine(end, "end", translators),
  }))

  const newRanges = headRanges
    .map(({ start, end }, i) => ({ isNew: start > end, original: ranges[i] }))
    .filter(({ isNew }) => isNew)
    .map(({ original }) => original)

  if (newRanges.length > 0) {
    const newRangesStr = newRanges.map(displayRange).join(", ")
    const message = `Can't show history for newly added lines: ${newRangesStr}`

    vscode.window.showInformationMessage(message)
    return
  }

  const rangeSuffix = headRanges.map(displayRange).join(",")
  const lineRanges = headRanges
    .map(({ start, end }) => `-L ${start},${end}:'${filename}'`)
    .join(" ")

  runCommandInTerminal({
    name: `${basename(filename)}:${rangeSuffix}`,
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "lineHistory",
      variables: { revision: "HEAD", lineRanges },
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
  ranges: Range[],
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

  const savedRanges = ranges.map(({ start, end }) => ({
    start: translateOldLine(start, "start", translators),
    end: translateOldLine(end, "end", translators),
  }))

  const unsavedRanges = savedRanges
    .map(({ start, end }, i) => ({ isNew: start > end, original: ranges[i] }))
    .filter(({ isNew }) => isNew)
    .map(({ original }) => original)

  if (unsavedRanges.length > 0) {
    const unsavedRangesStr = unsavedRanges.map(displayRange).join(", ")
    const message = `Can't show blame for unsaved lines: ${unsavedRangesStr}`

    vscode.window.showInformationMessage(message)
    return
  }

  const rangeSuffix = savedRanges.map(displayRange).join(",")
  const lineRanges = savedRanges
    .map(({ start, end }) => `-L ${start},${end}`)
    .join(" ")

  runCommandInTerminal({
    name: `${basename(filename)}:${rangeSuffix}`,
    icon: "person",
    cwd: directory,
    command: userGitCommand({
      key: "lineBlame",
      variables: { filename, lineRanges },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(filename, directory),
    },
  })
}

function translateOldLine(
  line: number,
  bound: "start" | "end",
  translators: LineTranslator[],
) {
  return translators.reduce((translated, t) => {
    const range = t.oldLine(translated)
    const newOffset = range.span === 0 && bound === "start" ? 1 : 0

    return range[bound] + newOffset
  }, line)
}

function displayRange({ start, end }: Range): string {
  return start === end ? `${start}` : `${start}-${end}`
}
