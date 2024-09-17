import { tmpdir } from "os"
import { join } from "path"
import * as vscode from "vscode"
import { RepositoryStore } from "../stores"
import { runCommandInTerminal, userGitCommand } from "../util"
import { suffixWithRevision, uriRevision } from "./common"

export async function stringSearch(
  document: vscode.TextDocument,
  selections: readonly vscode.Selection[],
  repositories: RepositoryStore,
) {
  const repository = repositories.getRepository(document.uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const revision = uriRevision(document.uri)
  const time = new Date().getTime()

  const files = selections.map((selection, index) => {
    const filename = `gitterm_search_${time}_${index}`
    const path = join(tmpdir(), filename)
    const uri = vscode.Uri.file(path)
    const text = document.getText(selection)
    const data = Buffer.from(text)

    vscode.workspace.fs.writeFile(uri, data)

    return uri
  })

  const searches = files.map((file) => `-S "$(cat ${file.fsPath})"`)

  const firstSelection = document.getText(selections[0])
  const setSearchEnv = selections.length === 1 && !firstSelection.includes("\n")

  runCommandInTerminal({
    name: await suffixWithRevision("String Search", revision, directory),
    icon: "search",
    cwd: directory,
    command: userGitCommand({
      key: "stringSearch",
      variables: { revision, searches },
    }),
    env: setSearchEnv ? { GITTERM_SEARCH: firstSelection } : undefined,
    onClose: () => files.forEach((file) => vscode.workspace.fs.delete(file)),
  })
}
