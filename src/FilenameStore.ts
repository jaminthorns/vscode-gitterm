import { writeFile } from "fs"
import { basename } from "path"
import * as vscode from "vscode"
import StringTrie from "./StringTrie"
import { git, streamCommand } from "./util"

export default interface FilenameStore extends vscode.Disposable {
  findMatches: StringTrie["findMatches"]
  writeToFile(): void
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

    writeToFile() {
      const debugFilename = `filenames_${Date.now()}`
      const debugFilePath = vscode.Uri.joinPath(directory, debugFilename).fsPath
      const filenamesData = filenames.getStrings().join("\n")

      writeFile(debugFilePath, filenamesData, () => {
        console.debug(`Filenames written to ${debugFilePath}`)
      })
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
  const initialCommit = await git("rev-parse", ["HEAD"], { directory })

  const refsDir = vscode.Uri.joinPath(gitDirectory, "refs")
  const refsPattern = new vscode.RelativePattern(refsDir, "**/*")
  const refWatcher = vscode.workspace.createFileSystemWatcher(refsPattern)

  refWatcher.onDidCreate(async (uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const content = await vscode.workspace.fs.readFile(uri)
      const commit = content.toString().trim()

      loadFilenames(directory, filenames, `${initialCommit}..${commit}`)
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
    "--name-only",
    "--no-renames",
    "--diff-merges=first-parent",
    "--diff-filter=A",
    "--format=",
  ]

  args = range === undefined ? ["--all", ...args] : [range, ...args]

  streamCommand("git", ["log", ...args], directory, (filename) => {
    filenames.addString(filename)
  })
}
