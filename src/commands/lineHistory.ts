import { basename } from "path"
import * as vscode from "vscode"
import { LineTranslator } from "../LineTranslator"
import { RepositoryStore } from "../stores"
import { commitFilenames, runCommandInTerminal, userGitCommand } from "../util"
import {
  Range,
  displayRange,
  suffixWithRevision,
  translateRanges,
  uriRevision,
} from "./common"

export async function lineHistory(
  document: vscode.TextDocument,
  ranges: Range[],
  repositories: RepositoryStore,
) {
  const repository = repositories.getRepository(document.uri)

  if (repository === undefined) {
    return
  }

  const { directory } = repository
  const filename = vscode.workspace.asRelativePath(document.uri, false)
  const revision = uriRevision(document.uri)

  let translatedRanges

  if (revision === "HEAD") {
    const translators = await Promise.all([
      // Unsaved
      LineTranslator.fromDiff(["--no-index", "--", filename, "-"], {
        directory,
        stdin: document.getText(),
        ignoreNonZeroExitCode: true,
      }),
      // Working Tree
      LineTranslator.fromDiff(["--", filename], { directory }),
      // Staged
      LineTranslator.fromDiff(["--staged", "--", filename], { directory }),
    ])

    translatedRanges = translateRanges(ranges, translators, "newly added")

    if (translatedRanges === null) {
      return
    }
  } else {
    translatedRanges = ranges
  }

  const rangeSuffix = translatedRanges.map(displayRange).join(",")
  const fileLineRanges = translatedRanges
    .map(({ start, end }) => `-L ${start},${end}:'${filename}'`)
    .join(" ")

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
