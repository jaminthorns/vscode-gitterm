import { basename } from "path"
import * as vscode from "vscode"
import { RepositoryStore } from "../stores"
import {
  commitFilenames,
  runCommandInTerminal,
  uriRevision,
  userGitCommand,
} from "../util"
import { suffixWithRevision } from "./common"
import { validateFileTracked } from "./validateFile"

export async function fileHistory(
  uri: vscode.Uri,
  repositories: RepositoryStore,
) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  // Check if file is tracked by Git
  if (!(await validateFileTracked(uri, repository))) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(uri, false)
  const revision = uriRevision(uri)
  const label = basename(filename)

  runCommandInTerminal({
    name: await suffixWithRevision(label, revision, directory),
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "fileHistory",
      variables: { revision, filename },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(revision, filename, directory),
    },
  })
}
