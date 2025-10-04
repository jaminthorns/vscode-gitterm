import * as vscode from "vscode"
import { Repository } from "../Repository"
import { git } from "../util"

export async function validateFileTracked(
  uri: vscode.Uri,
  repository: Repository,
): Promise<boolean> {
  const filename = vscode.workspace.asRelativePath(uri, false)

  try {
    await git("ls-files", ["--error-unmatch", filename], {
      directory: repository.directory,
    })
    return true
  } catch {
    vscode.window.showErrorMessage(`File "${filename}" is not tracked by Git.`)
    return false
  }
}

export async function validateDocumentTracked(
  document: vscode.TextDocument,
  repository: Repository,
): Promise<boolean> {
  return validateFileTracked(document.uri, repository)
}
