import { writeFile } from "fs"
import { basename, relative } from "path"
import * as vscode from "vscode"
import StringTrie from "./StringTrie"
import { streamCommand } from "./util"

type RefDirectory = "heads" | "remotes" | "tags"

interface RefCommand {
  subcommand: string
  args: string[]
}

export default interface RefStore extends vscode.Disposable {
  findMatches: StringTrie["findMatches"]
  writeToFile(): void
}

export default function RefStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
  refDirectory: RefDirectory,
  refCommand: RefCommand,
): RefStore {
  const branches = StringTrie()
  const refWatcher = setupRefWatcher(refDirectory, gitDirectory, branches)

  loadBranches(directory, branches, refCommand)

  return {
    findMatches(...args) {
      return branches.findMatches(...args)
    },

    writeToFile() {
      const debugFilename = `${refDirectory}_${Date.now()}`
      const debugFilePath = vscode.Uri.joinPath(directory, debugFilename).fsPath
      const branchesData = branches.getStrings().join("\n")

      writeFile(debugFilePath, branchesData, () => {
        console.debug(`Refs written to ${debugFilePath}`)
      })
    },

    dispose() {
      refWatcher.dispose()
    },
  }
}

function setupRefWatcher(
  refDirectory: RefDirectory,
  gitDirectory: vscode.Uri,
  branches: StringTrie,
): vscode.FileSystemWatcher {
  const dir = vscode.Uri.joinPath(gitDirectory, "refs", refDirectory)
  const pattern = new vscode.RelativePattern(dir, "**/*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate((uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      branches.addString(relative(dir.fsPath, uri.fsPath))
    }
  })

  watcher.onDidDelete((uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      branches.removeString(relative(dir.fsPath, uri.fsPath))
    }
  })

  return watcher
}

async function loadBranches(
  directory: vscode.Uri,
  branches: StringTrie,
  { subcommand, args }: RefCommand,
): Promise<void> {
  streamCommand("git", [subcommand, ...args], directory, (branch) => {
    branches.addString(branch)
  })
}
