import { basename } from "path"
import * as vscode from "vscode"
import { LineTranslator } from "./LineTranslator"
import RepositoryStore from "./RepositoryStore"
import {
  commitFilenames,
  diffForLineTranslation,
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

export function lineHistoryCommand(repositories: RepositoryStore) {
  return vscode.commands.registerCommand(
    "gitterm.lineHistory",
    ({ uri, lineNumber }: { uri: vscode.Uri; lineNumber: number }) =>
      lineHistory(uri, lineNumber, lineNumber, repositories),
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
        document.uri,
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
  uri: vscode.Uri,
  startLine: number,
  endLine: number,
  repositories: RepositoryStore,
) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(uri, false)

  const [worktreeDiff, stagedDiff] = await Promise.all([
    diffForLineTranslation(directory, ["--", filename]),
    diffForLineTranslation(directory, ["--staged", "--", filename]),
  ])

  const translators = [LineTranslator(worktreeDiff), LineTranslator(stagedDiff)]

  const translateOldLine = (line: number, bound: "start" | "end") => {
    return translators.reduce((translated, t) => {
      const range = t.oldLine(translated)
      const newOffset = range.span === 0 && bound === "start" ? 1 : 0

      return range[bound] + newOffset
    }, line)
  }

  const startLineHead = translateOldLine(startLine, "start")
  const endLineHead = translateOldLine(endLine, "end")
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
