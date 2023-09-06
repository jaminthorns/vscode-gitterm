import { basename, resolve } from "path"
import * as vscode from "vscode"
import StringTrie from "./StringTrie"
import { runGitCommand, streamCommand } from "./util"

export default interface FilenameStore extends vscode.Disposable {
  findMatches: StringTrie["findMatches"]
}

export default async function FilenameStore(
  directory: vscode.Uri,
): Promise<FilenameStore> {
  const filenames = StringTrie()
  const refsWatcher = await setupRefsWatcher(directory, filenames)

  loadFilenames(directory, filenames)

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
  directory: vscode.Uri,
  filenames: StringTrie,
): Promise<vscode.FileSystemWatcher> {
  const [gitDirRel, initialCommit] = await Promise.all([
    runGitCommand("rev-parse", directory, ["--git-common-dir"]),
    runGitCommand("rev-parse", directory, ["HEAD"]),
  ])

  const gitDirAbs = resolve(directory.fsPath, gitDirRel)
  const gitDir = vscode.Uri.parse(gitDirAbs)
  const refsDir = vscode.Uri.joinPath(gitDir, "refs")
  const refsPattern = new vscode.RelativePattern(refsDir, "**/*")
  const refsWatcher = vscode.workspace.createFileSystemWatcher(refsPattern)

  refsWatcher.onDidCreate(async (uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const content = await vscode.workspace.fs.readFile(uri)
      const commit = content.toString().trim()

      loadFilenames(uri, filenames, `${initialCommit}...${commit}`)
    }
  })

  return refsWatcher
}

function loadFilenames(
  directory: vscode.Uri,
  filenames: StringTrie,
  range?: string,
): void {
  let args = ["--all", "--format=", "--name-only", "--diff-filter=AR"]
  args = range === undefined ? args : [range, ...args]

  streamCommand("git", ["log", ...args], directory, (output) => {
    filenames.addStrings(output.split("\n"))
  })
}
