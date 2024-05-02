import { writeFile } from "fs"
import { relative } from "path"
import * as vscode from "vscode"
import {
  ReferenceType,
  ignoreReferenceFile,
  referenceInfo,
  referenceValid,
} from "./Reference"
import Trie from "./Trie"
import { isDirectory, streamCommand } from "./util"

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
    directory,
    gitDirectory,
    references,
  )

  const remoteWatcher = setupReferenceWatcher(
    "remote",
    directory,
    gitDirectory,
    references,
  )

  const tagWatcher = setupReferenceWatcher(
    "tag",
    directory,
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

// TODO: Handle reftable repositories.
function setupReferenceWatcher(
  type: ReferenceType,
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
  references: ReferenceTrie,
): vscode.FileSystemWatcher {
  const refDir = referenceInfo[type].directory
  const refsDir = vscode.Uri.joinPath(gitDirectory, "refs", refDir)
  const pattern = new vscode.RelativePattern(refsDir, "**/*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate(async (uri) => {
    if (ignoreReferenceFile(uri) || (await isDirectory(uri))) {
      return
    }

    const ref = relative(refsDir.fsPath, uri.fsPath)

    references.update(ref, (types = new Set()) => types.add(type))
  })

  // TODO: Handle deleting of packed refs.
  watcher.onDidDelete((uri) => {
    if (ignoreReferenceFile(uri)) {
      return
    }

    const refOrDir = relative(refsDir.fsPath, uri.fsPath)

    references
      .entries(refOrDir)
      .filter(([, types]) => types.has(type))
      .forEach(async ([ref, types]) => {
        // Valid references get deleted when being packed.
        if (await referenceValid(ref, type, directory)) {
          return
        }

        types.delete(type)

        if (types.size === 0) {
          references.delete(ref)
        }
      })
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
