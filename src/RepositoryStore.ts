import * as vscode from "vscode"
import Repository from "./Repository"

export default interface RepositoryStore {
  addRepository(folder: vscode.WorkspaceFolder): Promise<void>
  removeRepository(folder: vscode.WorkspaceFolder): void
  getRepository(uri: vscode.Uri): Repository | undefined
}

export default function RepositoryStore(): RepositoryStore {
  const repositories: Map<vscode.Uri, Repository> = new Map()

  return {
    async addRepository(folder) {
      repositories.set(folder.uri, await Repository(folder))
    },

    removeRepository(folder) {
      repositories.delete(folder.uri)
    },

    getRepository(uri) {
      const folder = vscode.workspace.getWorkspaceFolder(uri)
      return folder && repositories.get(folder.uri)
    },
  }
}
