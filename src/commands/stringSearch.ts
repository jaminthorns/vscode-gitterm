import { tmpdir } from "os"
import { join } from "path"
import * as vscode from "vscode"
import { RepositoryStore } from "../stores"
import {
  getValidatedRepository,
  runCommandInTerminal,
  uriRevision,
  userGitCommand,
} from "../util"
import { suffixWithRevision } from "./common"

export async function stringSearch(
  document: vscode.TextDocument,
  selections: readonly vscode.Selection[],
  repositories: RepositoryStore,
) {
  const repository = await getValidatedRepository(
    document.uri,
    repositories,
    "File",
  )

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const revision = uriRevision(document.uri)
  const time = new Date().getTime()

  const files = selections.map((selection, index) => {
    const filename = `gitsquatch_search_${time}_${index}`
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

  let env

  if (setSearchEnv) {
    const modifyEnv = vscode.workspace
      .getConfiguration("gitsquatch.selectionSearch")
      .get("modifyEnv") as null | "LESS" | "GITSQUATCH_SEARCH"

    if (modifyEnv === "LESS") {
      const { LESS } = process.env
      env = { LESS: `${LESS} --jump-target=.5 --pattern=${firstSelection}` }
    } else if (modifyEnv === "GITSQUATCH_SEARCH") {
      env = { GITSQUATCH_SEARCH: firstSelection }
    }
  }

  runCommandInTerminal({
    name: await suffixWithRevision("String Search", revision, directory),
    icon: "search",
    cwd: directory,
    env,
    command: userGitCommand({
      key: "stringSearch",
      variables: { revision, searches },
    }),
    onClose: () => files.forEach((file) => vscode.workspace.fs.delete(file)),
  })
}
