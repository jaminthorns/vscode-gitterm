import * as vscode from "vscode"
import RepositoryStore from "./RepositoryStore"

export function debugFilenames(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitterm.debugFilenames", () => {
    repositories.allRepositories().forEach((repository) => {
      repository.filenames.writeToFile()
    })
  })
}

export function debugLocalBranches(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitterm.debugLocalBranches", () => {
    repositories.allRepositories().forEach((repository) => {
      repository.localBranches.writeToFile()
    })
  })
}

export function debugRemoteBranches(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitterm.debugRemoteBranches", () => {
    repositories.allRepositories().forEach((repository) => {
      repository.remoteBranches.writeToFile()
    })
  })
}

export function debugTags(repositories: RepositoryStore) {
  return vscode.commands.registerCommand("gitterm.debugTags", () => {
    repositories.allRepositories().forEach((repository) => {
      repository.tags.writeToFile()
    })
  })
}
