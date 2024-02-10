import { writeFile } from "fs"
import { basename, relative } from "path"
import * as vscode from "vscode"
import Trie from "./Trie"
import { streamCommand } from "./util"

type RefTrie = Trie<Set<RefType>>
type RefType = "branch" | "remote" | "tag"

export default interface RefStore extends vscode.Disposable {
  findMatches: RefTrie["findMatches"]
  writeToFile(): void
}

export default function RefStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
): RefStore {
  const refs: RefTrie = Trie()

  const branchWatcher = setupRefWatcher("branch", "heads", gitDirectory, refs)
  const remoteWatcher = setupRefWatcher("remote", "remotes", gitDirectory, refs)
  const tagWatcher = setupRefWatcher("tag", "tags", gitDirectory, refs)

  loadRefs("branch", directory, refs, "branch", [
    "--format=%(refname:lstrip=2)",
  ])

  loadRefs("remote", directory, refs, "branch", [
    "--remotes",
    "--format=%(refname:lstrip=2)",
  ])

  loadRefs("tag", directory, refs, "tag", ["--format=%(refname:lstrip=2)"])

  return {
    findMatches(...args) {
      return refs.findMatches(...args)
    },

    writeToFile() {
      const debugFilename = `refs_${Date.now()}`
      const debugFilePath = vscode.Uri.joinPath(directory, debugFilename).fsPath
      const refsData = refs
        .entries()
        .map(([ref, types]) => `${ref}: ${Array.from(types).join(", ")}`)
        .join("\n")

      writeFile(debugFilePath, refsData, () => {
        console.debug(`Refs written to ${debugFilePath}`)
      })
    },

    dispose() {
      branchWatcher.dispose()
      remoteWatcher.dispose()
      tagWatcher.dispose()
    },
  }
}

function setupRefWatcher(
  type: RefType,
  refDirectory: string,
  gitDirectory: vscode.Uri,
  refs: RefTrie,
): vscode.FileSystemWatcher {
  const dir = vscode.Uri.joinPath(gitDirectory, "refs", refDirectory)
  const pattern = new vscode.RelativePattern(dir, "**/*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate((uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const ref = relative(dir.fsPath, uri.fsPath)

      refs.update(ref, (types = new Set()) => types.add(type))
    }
  })

  watcher.onDidDelete((uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const ref = relative(dir.fsPath, uri.fsPath)

      const types = refs.update(ref, (types = new Set()) => {
        types.delete(type)
        return types
      })

      if (types.size === 0) {
        refs.delete(ref)
      }
    }
  })

  return watcher
}

async function loadRefs(
  type: RefType,
  directory: vscode.Uri,
  refs: RefTrie,
  gitSubcommand: string,
  gitArgs: string[],
): Promise<void> {
  streamCommand("git", [gitSubcommand, ...gitArgs], directory, (branch) => {
    refs.update(branch, (types = new Set()) => types.add(type))
  })
}
