import { writeFile } from "fs"
import { relative } from "path"
import * as vscode from "vscode"
import {
  ReferenceType,
  ignoreReferenceFile,
  referenceInfo,
  referenceValid,
} from "../references"
import { Trie } from "../Trie"
import { isDirectory, streamCommand } from "../util"

type ReferenceTrie = Trie<null>

export interface ReferenceStore extends vscode.Disposable {
  findMatches: ReferenceTrie["findMatches"]
  entries: ReferenceTrie["entries"]
  writeToFile(): void
}

export function createReferenceStore({
  type,
  gitSubcommand,
  gitArgs,
  debugFilePrefix,
  debugMessageLabel,
  directory,
  gitDirectory,
}: {
  type: ReferenceType
  gitSubcommand: string
  gitArgs: string[]
  debugFilePrefix: string
  debugMessageLabel: string
  directory: vscode.Uri
  gitDirectory: vscode.Uri
}): ReferenceStore {
  const references: ReferenceTrie = Trie()

  const referencesWatcher = setupReferenceWatcher(
    type,
    directory,
    gitDirectory,
    references,
  )

  loadReferences(directory, references, gitSubcommand, gitArgs)

  return {
    findMatches(...args) {
      return references.findMatches(...args)
    },

    entries(...args) {
      return references.entries(...args)
    },

    writeToFile() {
      const debugFilename = `${debugFilePrefix}_${Date.now()}`
      const debugFilePath = vscode.Uri.joinPath(directory, debugFilename).fsPath
      const referencesData = references
        .entries()
        .map(([reference]) => reference)
        .join("\n")

      writeFile(debugFilePath, referencesData, () => {
        console.debug(`${debugMessageLabel} written to ${debugFilePath}`)
      })
    },

    dispose() {
      referencesWatcher.dispose()
    },
  }
}

// TODO: Handle reftable repositories.
export function setupReferenceWatcher(
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

    references.set(ref, null)
  })

  // TODO: Handle deleting of packed refs.
  watcher.onDidDelete((uri) => {
    if (ignoreReferenceFile(uri)) {
      return
    }

    const refOrDir = relative(refsDir.fsPath, uri.fsPath)

    references.entries(refOrDir).forEach(async ([ref]) => {
      // Valid references get deleted when being packed.
      if (await referenceValid(ref, type, directory)) {
        return
      }

      references.delete(ref)
    })
  })

  return watcher
}

export function loadReferences(
  directory: vscode.Uri,
  references: ReferenceTrie,
  gitSubcommand: string,
  gitArgs: string[],
) {
  streamCommand("git", [gitSubcommand, ...gitArgs], directory, (ref) => {
    references.set(ref, null)
  })
}
