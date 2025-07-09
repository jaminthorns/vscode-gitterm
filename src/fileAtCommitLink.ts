import { existsSync } from "fs"
import { join, relative } from "path"
import * as vscode from "vscode"
import { LineTranslator } from "./LineTranslator"
import { Repository } from "./Repository"
import { git, uriRevision } from "./util"

export async function fileAtCommitLink(
  repository: Repository,
  document: vscode.TextDocument,
  position: vscode.Position,
): Promise<vscode.LocationLink | null> {
  const { directory } = repository
  const originLine = document.lineAt(position)
  const originPath = relative(directory.fsPath, document.uri.path)
  const revision = uriRevision(document.uri)

  const targetPath = await latestPath(originPath, revision, "HEAD", directory)
  const targetUri = vscode.Uri.file(join(directory.fsPath, targetPath))

  if (!existsSync(targetUri.fsPath)) {
    return null
  }

  const originBlob = `${revision}:${originPath}`
  const targetBlob = `HEAD:${targetPath}`
  const targetDocument = await vscode.workspace.openTextDocument(targetUri)

  const translators = await Promise.all([
    // Revision -> Working Tree
    LineTranslator.fromDiff([originBlob, targetBlob], { directory }),
    // Working Tree -> Document
    LineTranslator.fromDiff(["--no-index", "--", targetPath, "-"], {
      directory,
      stdin: targetDocument.getText(),
      ignoreNonZeroExitCode: true,
    }),
  ])

  const revisionRange = {
    start: originLine.lineNumber,
    end: originLine.lineNumber,
  }

  const docRange = LineTranslator.newRangeAcross(revisionRange, translators)
  const targetRange = new vscode.Range(docRange.start, 0, docRange.end, 0)

  let targetSelectionRange

  // If origin and target lines are identical, select the same position.
  if (
    targetRange.isSingleLine &&
    originLine.text === targetDocument.lineAt(targetRange.start).text
  ) {
    const line = targetRange.start.line
    const targetPosition = new vscode.Position(line, position.character)

    targetSelectionRange = new vscode.Range(targetPosition, targetPosition)
  }

  return {
    originSelectionRange: originLine.range,
    targetUri,
    targetRange,
    targetSelectionRange,
  }
}

// Find the latest path by navigating all renames between fromRef and toRef.
async function latestPath(
  fromPath: string,
  fromRef: string,
  toRef: string,
  directory: vscode.Uri,
): Promise<string> {
  const args = [
    "--ancestry-path",
    "--diff-filter=R",
    "--format=",
    "--name-status",
    `${fromRef}..${toRef}`,
  ]

  const output = await git("log", args, { directory })

  const pathRenames = output.split("\n").map((line) => {
    const [, from, to] = line.split("\t")
    return { from, to }
  })

  pathRenames.reverse()

  return findLatestPath(fromPath, pathRenames)
}

function findLatestPath(
  currentPath: string,
  renames: { from: string; to: string }[],
): string {
  const nextIndex = renames.findIndex(({ from }) => from === currentPath)

  if (nextIndex === -1) {
    return currentPath
  } else {
    const { to } = renames[nextIndex]
    const newRenames = renames.slice(nextIndex + 1)

    return findLatestPath(to, newRenames)
  }
}
