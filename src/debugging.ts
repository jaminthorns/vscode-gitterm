import * as vscode from "vscode"
import { RepositoryStore } from "./stores"

export function debugFilenames(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitterm.debugFilenames", () => {
    repositories.allRepositories().forEach((repository) => {
      repository.filenames.writeToFile()
    })
  })
}

export function debugReferences(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitterm.debugReferences", () => {
    repositories.allRepositories().forEach((repository) => {
      repository.references.writeToFile()
    })
  })
}
