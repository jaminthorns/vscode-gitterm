import { existsSync } from "fs"
import * as vscode from "vscode"
import { LineTranslator } from "../LineTranslator"
import { RepositoryStore } from "../stores"
import { uriRevision } from "../util"

export function fileAtCommitLineProvider(
  repositories: RepositoryStore,
): vscode.Disposable {
  return vscode.languages.registerDefinitionProvider([{ scheme: "git" }], {
    async provideDefinition(
      document: vscode.TextDocument,
      position: vscode.Position,
    ): Promise<vscode.DefinitionLink[] | null> {
      const repository = repositories.getRepository(document.uri)

      if (repository === undefined) {
        return null
      }

      const { directory } = repository
      const originLine = document.lineAt(position)
      const revision = uriRevision(document.uri)
      const targetUri = vscode.Uri.file(document.uri.path)

      if (!existsSync(targetUri.fsPath)) {
        return null
      }

      // TODO: Account for unsaved changes.
      const translator = await LineTranslator.fromDiff(
        [revision, "HEAD", "--", targetUri.path],
        { directory },
      )

      const lineRange = translator.newLine(originLine.lineNumber)
      const targetRange = new vscode.Range(lineRange.start, 0, lineRange.end, 0)
      const targetDocument = await vscode.workspace.openTextDocument(targetUri)

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

      return [
        {
          originSelectionRange: originLine.range,
          targetUri,
          targetRange,
          targetSelectionRange,
        },
      ]
    },
  })
}
