import { basename } from "path"
import * as vscode from "vscode"
import StringTrie from "./StringTrie"
import { runCommand, streamCommand } from "./util"

export default interface FilenameStore extends vscode.Disposable {
  findMatches: StringTrie["findMatches"]
}

export async function createFilenameStore(
  gitDir: vscode.Uri,
): Promise<FilenameStore> {
  const filenames = new StringTrie()
  const refsWatcher = await setupRefsWatcher(gitDir, filenames)

  loadFilenames(filenames)

  return {
    findMatches(...args) {
      return filenames.findMatches(...args)
    },

    dispose() {
      refsWatcher.dispose()
    },
  }
}

async function setupRefsWatcher(
  gitDir: vscode.Uri,
  filenames: StringTrie,
): Promise<vscode.FileSystemWatcher> {
  const initialCommit = await runCommand("git", ["rev-parse", "HEAD"])

  const refsDir = vscode.Uri.joinPath(gitDir, "refs")
  const refsPattern = new vscode.RelativePattern(refsDir, "**/*")
  const refsWatcher = vscode.workspace.createFileSystemWatcher(refsPattern)

  refsWatcher.onDidCreate(async (uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const content = await vscode.workspace.fs.readFile(uri)
      const commit = content.toString().trim()

      loadFilenames(filenames, `${initialCommit}...${commit}`)
    }
  })

  return refsWatcher
}

function loadFilenames(filenames: StringTrie, range?: string): void {
  let args = ["--all", "--format=", "--name-only", "--diff-filter=AR"]
  args = range === undefined ? args : [range, ...args]

  streamCommand("git", ["log", ...args], (output) => {
    filenames.addStrings(output.split("\n"))
  })
}
