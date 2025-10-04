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
import {
  blameMoveCopyDetectionFlags,
  displayRange,
  oldRanges,
  suffixWithRevision,
} from "./common"
import { validateDocumentTracked } from "./validateFile"

export async function lineBlame(
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

  let workingTreeRanges

  if (revision === "HEAD") {
    const translators = [
      // Working Tree -> Document
      await LineTranslator.fromDiff(["--no-index", "--", filename, "-"], {
        directory,
        stdin: document.getText(),
        ignoreNonZeroExitCode: true,
      }),
    ]

    workingTreeRanges = oldRanges(ranges, translators, "unsaved")

    if (workingTreeRanges === null) {
      return
    }
  } else {
    workingTreeRanges = ranges
  }

  const rangeSuffix = workingTreeRanges.map(displayRange).join(",")
  const lineRanges = workingTreeRanges
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
