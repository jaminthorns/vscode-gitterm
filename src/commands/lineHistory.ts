import { basename } from "path"
import * as vscode from "vscode"
import { LineRange, LineTranslator } from "../LineTranslator"
import { RepositoryStore } from "../stores"
import {
  commitFilenames,
  runCommandInTerminal,
  uriRevision,
  userGitCommand,
} from "../util"
import { displayRange, oldRanges, suffixWithRevision } from "./common"
import { validateDocumentTracked } from "./validateFile"

export async function lineHistory(
  document: vscode.TextDocument,
  ranges: LineRange[],
  repositories: RepositoryStore,
) {
  const repository = repositories.getRepository(document.uri)

  if (repository === undefined) {
    return
  }

  // Check if file is tracked by Git
  if (!(await validateDocumentTracked(document, repository))) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(document.uri, false)
  const revision = uriRevision(document.uri)

  let documentRanges

  if (revision === "HEAD") {
    const translators = await Promise.all([
      // Working Tree -> Document
      LineTranslator.fromDiff(["--no-index", "--", filename, "-"], {
        directory,
        stdin: document.getText(),
        ignoreNonZeroExitCode: true,
      }),
      // HEAD -> Working Tree
      LineTranslator.fromDiff(["HEAD", "--", filename], { directory }),
    ])

    documentRanges = oldRanges(ranges, translators, "newly added")

    if (documentRanges === null) {
      return
    }
  } else {
    documentRanges = ranges
  }

  const rangeSuffix = documentRanges.map(displayRange).join(",")
  const fileLineRanges = documentRanges.map(
    ({ start, end }) => `-L ${start},${end}:'${filename}'`,
  )

  const label = `${basename(filename)}:${rangeSuffix}`

  runCommandInTerminal({
    name: await suffixWithRevision(label, revision, directory),
    icon: "history",
    cwd: directory,
    command: userGitCommand({
      key: "lineHistory",
      variables: { revision, fileLineRanges },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(revision, filename, directory),
    },
  })
}
