import { basename } from "path"
import * as vscode from "vscode"
import RepositoryStore from "./RepositoryStore"
import { commitFilenames, runCommandInTerminal, userGitCommand } from "./util"

export function fileHistory(repositories: RepositoryStore) {
  return vscode.commands.registerTextEditorCommand(
    "gitterm.fileHistory",
    ({ document }: vscode.TextEditor) => {
      const repository = repositories.getRepository(document.uri)

      if (repository === undefined) {
        return
      }

      const filename = vscode.workspace.asRelativePath(document.uri, false)

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

      const filename = vscode.workspace.asRelativePath(document.uri, false)
      const startLine = selection.start.line + 1
      const endLine = selection.end.line + 1
      const lineRange = `${startLine},${endLine}`
      const lineSuffix = startLine === endLine ? startLine : lineRange

      runCommandInTerminal({
        name: `${basename(filename)}:${lineSuffix}`,
        icon: "history",
        cwd: repository.directory,
        command: userGitCommand({
          key: "lineHistory",
          variables: { filename, commit: "HEAD", startLine, endLine },
        }),
        context: {
          filename,
          commitFilenames: commitFilenames(filename, repository.directory),
        },
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
    },
  )
}
