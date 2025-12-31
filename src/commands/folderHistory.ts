import { basename } from "path"
import * as vscode from "vscode"
import { RepositoryStore } from "../stores"
import {
  getValidatedRepository,
  runCommandInTerminal,
  userGitCommand,
} from "../util"

export async function folderHistory(
  uri: vscode.Uri,
  repositories: RepositoryStore,
) {
  const repository = await getValidatedRepository(uri, repositories, "Folder")

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const folder = vscode.workspace.asRelativePath(uri, false)

  runCommandInTerminal({
    name: basename(folder),
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "folderHistory",
      variables: { revision: "HEAD", folder },
    }),
    context: { folder },
  })
}
