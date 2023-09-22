import { basename } from "path"
import * as vscode from "vscode"
import StringTrie from "./StringTrie"
import { runGitCommand, streamCommand } from "./util"

export default interface FilenameStore extends vscode.Disposable {
  findMatches: StringTrie["findMatches"]
}

export default async function FilenameStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
): Promise<FilenameStore> {
  const filenames = StringTrie()
  const refWatcher = await setupRefWatcher(directory, gitDirectory, filenames)

  loadFilenames(directory, filenames)

  return {
    findMatches(...args) {
      return filenames.findMatches(...args)
    },

    dispose() {
      refWatcher.dispose()
    },
  }
}

async function setupRefWatcher(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
  filenames: StringTrie,
): Promise<vscode.FileSystemWatcher> {
  const initialCommit = await runGitCommand("rev-parse", directory, ["HEAD"])

  const refsDir = vscode.Uri.joinPath(gitDirectory, "refs")
  const refsPattern = new vscode.RelativePattern(refsDir, "**/*")
  const refWatcher = vscode.workspace.createFileSystemWatcher(refsPattern)

  refWatcher.onDidCreate(async (uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const content = await vscode.workspace.fs.readFile(uri)
      const commit = content.toString().trim()

      loadFilenames(uri, filenames, `${initialCommit}...${commit}`)
    }
  })

  return refWatcher
}

function loadFilenames(
  directory: vscode.Uri,
  filenames: StringTrie,
  range?: string,
): void {
  let args = [
    "--all",
    "--name-only",
    "--no-renames",
    "--diff-merges=first-parent",
    "--diff-filter=A",
    "--format=",
  ]

  args = range === undefined ? args : [range, ...args]

  streamCommand("git", ["log", ...args], directory, (output) => {
    filenames.addStrings(output.split("\n"))
  })
}
