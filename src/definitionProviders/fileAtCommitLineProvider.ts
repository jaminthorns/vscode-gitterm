import * as vscode from "vscode"
import { fileAtCommitLink } from "../fileAtCommitLink"
import { RepositoryStore } from "../stores"

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

      const link = await fileAtCommitLink(repository, document, position)

      if (link === null) {
        return null
      }

      return [link]
    },
  })
}
