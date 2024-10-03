import { basename } from "path"
import * as vscode from "vscode"
import { LineTranslator } from "../LineTranslator"
import { RepositoryStore } from "../stores"
import { commitFilenames, runCommandInTerminal, userGitCommand } from "../util"
import {
  Range,
  blameMoveCopyDetectionFlags,
  displayRange,
  suffixWithRevision,
  translateRanges,
  uriRevision,
} from "./common"

export async function lineBlame(
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
  const revision = uriRevision(document.uri, repository)

  let translatedRanges

  if (revision === "HEAD") {
    const translators = [
      // Unsaved
      await LineTranslator.fromDiff(["--no-index", "--", filename, "-"], {
        directory,
        stdin: document.getText(),
        ignoreNonZeroExitCode: true,
      }),
    ]

    translatedRanges = translateRanges(ranges, translators, "unsaved")

    if (translatedRanges === null) {
      return
    }
  } else {
    translatedRanges = ranges
  }

  const rangeSuffix = translatedRanges.map(displayRange).join(",")
  const lineRanges = translatedRanges
    .map(({ start, end }) => `-L ${start},${end}`)
    .join(" ")

  const label = `${basename(filename)}:${rangeSuffix}`

  runCommandInTerminal({
    name: await suffixWithRevision(label, revision, directory),
    icon: "person",
    cwd: directory,
    command: userGitCommand({
      key: "lineBlame",
      variables: {
        revision,
        filename,
        lineRanges,
        moveCopyDetectionFlags: blameMoveCopyDetectionFlags(),
      },
    }),
    context: {
      filename,
      commitFilenames: commitFilenames(revision, filename, directory),
    },
  })
}
