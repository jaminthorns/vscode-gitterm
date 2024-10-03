import { basename } from "path"
import * as vscode from "vscode"
import { RepositoryStore } from "../stores"
import { commitFilenames, runCommandInTerminal, userGitCommand } from "../util"
import {
  blameMoveCopyDetectionFlags,
  suffixWithRevision,
  uriRevision,
} from "./common"

export async function fileBlame(
  uri: vscode.Uri,
  repositories: RepositoryStore,
) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(uri, false)
  const revision = uriRevision(uri, repository)
  const label = basename(filename)

  runCommandInTerminal({
    name: await suffixWithRevision(label, revision, directory),
    icon: "person",
    cwd: directory,
    command: userGitCommand({
      key: "fileBlame",
      variables: {
        revision,
        filename,
        moveCopyDetectionFlags: blameMoveCopyDetectionFlags(),
      },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(revision, filename, directory),
    },
  })
}
