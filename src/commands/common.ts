import * as vscode from "vscode"
import { Commit } from "../Commit"
import { LineRange, LineTranslator } from "../LineTranslator"

export async function suffixWithRevision(
  label: string,
  revision: string,
  directory: vscode.Uri,
): Promise<string> {
  if (revision === "HEAD") {
    return label
  }

  const commit = await Commit(revision, directory)

  if (commit === null) {
    return label
  } else {
    return `${label} (${commit.short})`
  }
}

export function oldRanges(
  ranges: LineRange[],
  translators: LineTranslator[],
  invalidAdjective: string,
): LineRange[] | null {
  const translatedRanges = ranges.map((range) =>
    LineTranslator.oldRangeAcross(range, translators),
  )

  const invalidRanges = translatedRanges
    .map(({ start, end }, i) => ({ invalid: start > end, original: ranges[i] }))
    .filter(({ invalid }) => invalid)
    .map(({ original }) => original)

  if (invalidRanges.length > 0) {
    const newRangesStr = invalidRanges.map(displayRange).join(", ")
    const message = `Can't show history for ${invalidAdjective} lines: ${newRangesStr}`

    vscode.window.showInformationMessage(message)

    return null
  } else {
    return translatedRanges
  }
}

export function displayRange({ start, end }: LineRange): string {
  return start === end ? `${start}` : `${start}-${end}`
}

export function blameMoveCopyDetectionFlags(): string[] {
  const sameFile = vscode.workspace
    .getConfiguration("gitterm.blame")
    .get("sameFileMoveCopyDetection") as "on" | "off"

  const otherFiles = vscode.workspace
    .getConfiguration("gitterm.blame")
    .get("otherFilesMoveCopyDetection") as
    | "off"
    | "sameCommit"
    | "sameAndFileCreationCommit"
    | "anyCommit"

  const sameFileFlags = {
    off: [],
    on: ["-M"],
  }

  const otherFilesFlags = {
    off: [],
    sameCommit: ["-C"],
    sameAndFileCreationCommit: ["-C", "-C"],
    anyCommit: ["-C", "-C", "-C"],
  }

  return [...sameFileFlags[sameFile], ...otherFilesFlags[otherFiles]]
}
