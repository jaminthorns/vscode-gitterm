import { sep } from "path"
import * as vscode from "vscode"
import { Repository } from "../Repository"

export interface RepositoryStore {
  addRepository(folder: vscode.WorkspaceFolder): Promise<void>
  removeRepository(folder: vscode.WorkspaceFolder): void
  getRepository(uri: vscode.Uri): Repository | undefined
  allRepositories(): Repository[]
}

export function RepositoryStore(): RepositoryStore {
  const repositories: Map<vscode.Uri, Repository> = new Map()

  return {
    async addRepository(folder) {
      repositories.set(folder.uri, await Repository(folder))
    },

    removeRepository(folder) {
      repositories.delete(folder.uri)
    },

    getRepository(uri) {
      const fileUri = vscode.Uri.file(normalize(uri.path)) // Account for non-file URIs
      const folder = vscode.workspace.getWorkspaceFolder(fileUri)

      return folder && repositories.get(folder.uri)
    },

    allRepositories() {
      return Array.from(repositories.values())
    },
  }
}

function normalize(path: string) {
  switch (sep) {
    case "/":
      return path.replaceAll("\\", "/")

    case "\\":
      return path.replaceAll("/", "\\")
  }
}
