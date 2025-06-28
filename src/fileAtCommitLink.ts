import { existsSync } from "fs"
import * as vscode from "vscode"
import { LineTranslator } from "./LineTranslator"
import { Repository } from "./Repository"
import { uriRevision } from "./util"

export async function fileAtCommitLink(
  repository: Repository,
  document: vscode.TextDocument,
  position: vscode.Position,
): Promise<vscode.LocationLink | null> {
  const { directory } = repository
  const originLine = document.lineAt(position)
  const revision = uriRevision(document.uri)
  const targetUri = vscode.Uri.file(document.uri.path)

  if (!existsSync(targetUri.fsPath)) {
    return null
  }

  const targetDocument = await vscode.workspace.openTextDocument(targetUri)

  const translators = await Promise.all([
    // Revision -> Working Tree
    LineTranslator.fromDiff([revision, "--", targetUri.path], {
      directory,
    }),
    // Working Tree -> Document
    LineTranslator.fromDiff(["--no-index", "--", targetUri.path, "-"], {
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
