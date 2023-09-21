import { basename } from "path"
import * as vscode from "vscode"
import { CommitFilenames } from "./context"
import RepositoryStore from "./RepositoryStore"
import {
  chunk,
  runCommandInTerminal,
  runGitCommand,
  userGitCommand,
} from "./util"

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
        command: userGitCommand("fileHistory", { filename }),
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
        command: userGitCommand("lineHistory", {
          filename,
          startLine,
          endLine,
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
        command: userGitCommand("fileBlame", { filename }),
        context: {
          filename,
          commitFilenames: commitFilenames(filename, repository.directory),
        },
      })
    },
  )
}

// Get a mapping that provides historical paths by commit for a given path
async function commitFilenames(
  path: string,
  directory: vscode.Uri,
): Promise<CommitFilenames | null> {
  try {
    const args = ["-m", "--follow", "--name-only", "--format=%H", "--", path]
    const output = await runGitCommand("log", directory, args)

    return new Map(chunk(output.split(/\n+/), 2) as [string, string][])
  } catch (error) {
    return null
  }
}
