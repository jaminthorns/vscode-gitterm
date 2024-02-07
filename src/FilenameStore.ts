import { writeFile } from "fs"
import { basename } from "path"
import * as vscode from "vscode"
import StringTrie from "./StringTrie"
import { git, streamCommand } from "./util"

type FilenameTrie = StringTrie<null>

export default interface FilenameStore extends vscode.Disposable {
  findMatches: FilenameTrie["findMatches"]
  writeToFile(): void
}

export default async function FilenameStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
): Promise<FilenameStore> {
  const filenames: FilenameTrie = StringTrie()

  const filenameWatcher = await setupFilenameWatcher(
    directory,
    gitDirectory,
    filenames,
  )

  loadFilenames(directory, filenames)

  return {
    findMatches(...args) {
      return filenames.findMatches(...args)
    },

    writeToFile() {
      const debugFilename = `filenames_${Date.now()}`
      const debugFilePath = vscode.Uri.joinPath(directory, debugFilename).fsPath
      const filenamesData = filenames.getEntries().join("\n")

      writeFile(debugFilePath, filenamesData, () => {
        console.debug(`Filenames written to ${debugFilePath}`)
      })
    },

    dispose() {
      filenameWatcher.dispose()
    },
  }
}

async function setupFilenameWatcher(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
  filenames: FilenameTrie,
): Promise<vscode.FileSystemWatcher> {
  const initialCommit = await git("rev-parse", ["HEAD"], { directory })

  const dir = vscode.Uri.joinPath(gitDirectory, "refs")
  const pattern = new vscode.RelativePattern(dir, "**/*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate(async (uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const content = await vscode.workspace.fs.readFile(uri)
      const commit = content.toString().trim()

      loadFilenames(directory, filenames, `${initialCommit}..${commit}`)
    }
  })

  return watcher
}

function loadFilenames(
  directory: vscode.Uri,
  filenames: FilenameTrie,
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
    filenames.addString(filename, null)
  })
}
