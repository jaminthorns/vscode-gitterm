import * as vscode from "vscode"
import RepositoryStore from "./RepositoryStore"

export function debugFilenames(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitterm.debugFilenames", () => {
    repositories.allRepositories().forEach((repository) => {
      repository.filenames.writeToFile()
    })
  })
}

export function debugRefs(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitterm.debugRefs", () => {
    repositories.allRepositories().forEach((repository) => {
      repository.refs.writeToFile()
    })
  })
}
