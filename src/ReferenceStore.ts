import { writeFile } from "fs"
import { basename, relative } from "path"
import * as vscode from "vscode"
import { ReferenceType } from "./Reference"
import Trie from "./Trie"
import { streamCommand } from "./util"

type ReferenceTrie = Trie<Set<ReferenceType>>

export default interface ReferenceStore extends vscode.Disposable {
  findMatches: ReferenceTrie["findMatches"]
  writeToFile(): void
}

export default function ReferenceStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
): ReferenceStore {
  const references: ReferenceTrie = Trie()

  const branchWatcher = setupReferenceWatcher(
    "branch",
    "heads",
    gitDirectory,
    references,
  )

  const remoteWatcher = setupReferenceWatcher(
    "remote",
    "remotes",
    gitDirectory,
    references,
  )

  const tagWatcher = setupReferenceWatcher(
    "tag",
    "tags",
    gitDirectory,
    references,
  )

  loadReferences("branch", directory, references, "branch", [
    "--format=%(refname:lstrip=2)",
  ])

  loadReferences("remote", directory, references, "branch", [
    "--remotes",
    "--format=%(refname:lstrip=2)",
  ])

  loadReferences("tag", directory, references, "tag", [
    "--format=%(refname:lstrip=2)",
  ])

  return {
    findMatches(...args) {
      return references.findMatches(...args)
    },

    writeToFile() {
      const debugFilename = `refs_${Date.now()}`
      const debugFilePath = vscode.Uri.joinPath(directory, debugFilename).fsPath
      const referencesData = references
        .entries()
        .map(([ref, types]) => `${ref}: ${Array.from(types).join(", ")}`)
        .join("\n")

      writeFile(debugFilePath, referencesData, () => {
        console.debug(`References written to ${debugFilePath}`)
      })
    },

    dispose() {
      branchWatcher.dispose()
      remoteWatcher.dispose()
      tagWatcher.dispose()
    },
  }
}

function setupReferenceWatcher(
  type: ReferenceType,
  refDirectory: string,
  gitDirectory: vscode.Uri,
  references: ReferenceTrie,
): vscode.FileSystemWatcher {
  const dir = vscode.Uri.joinPath(gitDirectory, "refs", refDirectory)
  const pattern = new vscode.RelativePattern(dir, "**/*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate((uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const ref = relative(dir.fsPath, uri.fsPath)

      references.update(ref, (types = new Set()) => types.add(type))
    }
  })

  watcher.onDidDelete((uri) => {
    if (basename(uri.fsPath) !== "HEAD") {
      const ref = relative(dir.fsPath, uri.fsPath)

      const types = references.update(ref, (types = new Set()) => {
        types.delete(type)
        return types
      })

      if (types.size === 0) {
        references.delete(ref)
      }
    }
  })

  return watcher
}

async function loadReferences(
  type: ReferenceType,
  directory: vscode.Uri,
  references: ReferenceTrie,
  gitSubcommand: string,
  gitArgs: string[],
): Promise<void> {
  streamCommand("git", [gitSubcommand, ...gitArgs], directory, (branch) => {
    references.update(branch, (types = new Set()) => types.add(type))
  })
}
