import { basename } from "path"
import * as vscode from "vscode"
import { Commit } from "./Commit"
import { LineTranslator } from "./LineTranslator"
import { RepositoryStore } from "./stores"
import { commitFilenames, runCommandInTerminal, userGitCommand } from "./util"

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
      variables: { revision: "HEAD", folder },
    }),
    context: { folder },
  })
}

async function fileHistory(uri: vscode.Uri, repositories: RepositoryStore) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(uri, false)
  const revision = uriRevision(uri)
  const label = basename(filename)

  runCommandInTerminal({
    name: await suffixWithRevision(label, revision, directory),
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "fileHistory",
      variables: { revision, filename },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(revision, filename, directory),
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
  const revision = uriRevision(document.uri)

  let translatedRanges

  if (revision === "HEAD") {
    const translators = await Promise.all([
      // Unsaved
      LineTranslator.fromDiff(["--no-index", "--", filename, "-"], {
        directory,
        stdin: document.getText(),
        ignoreNonZeroExitCode: true,
      }),
      // Working Tree
      LineTranslator.fromDiff(["--", filename], { directory }),
      // Staged
      LineTranslator.fromDiff(["--staged", "--", filename], { directory }),
    ])

    translatedRanges = translateRanges(ranges, translators, "newly added")

    if (translatedRanges === null) {
      return null
    }
  } else {
    translatedRanges = ranges
  }

  const rangeSuffix = translatedRanges.map(displayRange).join(",")
  const fileLineRanges = translatedRanges
    .map(({ start, end }) => `-L ${start},${end}:'${filename}'`)
    .join(" ")

  const label = `${basename(filename)}:${rangeSuffix}`

  runCommandInTerminal({
    name: await suffixWithRevision(label, revision, directory),
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "lineHistory",
      variables: { revision, fileLineRanges },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(revision, filename, directory),
    },
  })
}

async function fileBlame(uri: vscode.Uri, repositories: RepositoryStore) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(uri, false)
  const revision = uriRevision(uri)
  const label = basename(filename)

  runCommandInTerminal({
    name: await suffixWithRevision(label, revision, directory),
    icon: "person",
    cwd: directory,
    command: userGitCommand({
      key: "fileBlame",
      variables: { revision, filename },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(revision, filename, directory),
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
  const revision = uriRevision(document.uri)

  let translatedRanges

  if (revision === "HEAD") {
    const translators = [
      // Unsaved
      await LineTranslator.fromDiff(["--no-index", "--", filename, "-"], {
        directory,
        stdin: document.getText(),
        ignoreNonZeroExitCode: true,
      }),
    ]

    translatedRanges = translateRanges(ranges, translators, "unsaved")

    if (translatedRanges === null) {
      return
    }
  } else {
    translatedRanges = ranges
  }

  const rangeSuffix = translatedRanges.map(displayRange).join(",")
  const lineRanges = translatedRanges
    .map(({ start, end }) => `-L ${start},${end}`)
    .join(" ")

  const label = `${basename(filename)}:${rangeSuffix}`

  runCommandInTerminal({
    name: await suffixWithRevision(label, revision, directory),
    icon: "person",
    cwd: directory,
    command: userGitCommand({
      key: "lineBlame",
      variables: { revision, filename, lineRanges },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(revision, filename, directory),
    },
  })
}

function uriRevision(uri: vscode.Uri): string {
  if (uri.scheme === "file") {
    return "HEAD"
  } else if (["git", "git-commit"].includes(uri.scheme)) {
    return JSON.parse(uri.query).ref
  } else {
    throw Error(`Cannot get revision from URI: ${uri}`)
  }
}

function translateRanges(
  ranges: Range[],
  translators: LineTranslator[],
  invalidAdjective: string,
): Range[] | null {
  const translatedRanges = ranges.map(({ start, end }) => ({
    start: translateOldLine(start, "start", translators),
    end: translateOldLine(end, "end", translators),
  }))

  const invalidRanges = translatedRanges
    .map(({ start, end }, i) => ({ invalid: start > end, original: ranges[i] }))
    .filter(({ invalid }) => invalid)
    .map(({ original }) => original)

  if (invalidRanges.length > 0) {
    const newRangesStr = invalidRanges.map(displayRange).join(", ")
    const message = `Can't show history for ${invalidAdjective} lines: ${newRangesStr}`

    vscode.window.showInformationMessage(message)

    return null
  } else {
    return translatedRanges
  }
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

async function suffixWithRevision(
  label: string,
  revision: string,
  directory: vscode.Uri,
) {
  if (revision === "HEAD") {
    return label
  }

  const commit = await Commit(revision, directory)

  if (commit === null) {
    return label
  } else {
    return `${label} (${commit.abbreviated})`
  }
}
