import * as vscode from "vscode"
import { Commit } from "../Commit"
import { LineTranslator } from "../LineTranslator"

export interface Range {
  start: number
  end: number
}

export function uriRevision(uri: vscode.Uri): string {
  if (uri.scheme === "file") {
    return "HEAD"
  } else if (["git", "git-commit"].includes(uri.scheme)) {
    return JSON.parse(uri.query).ref
  } else {
    throw Error(`Cannot get revision from URI: ${uri}`)
  }
}

export async function suffixWithRevision(
  label: string,
  revision: string,
  directory: vscode.Uri,
) {
  if (revision === "HEAD") {
    return label
  }

  const commit = await Commit(revision, directory)

  if (commit === null) {
    return label
  } else {
    return `${label} (${commit.abbreviated})`
  }
}

export function translateRanges(
  ranges: Range[],
  translators: LineTranslator[],
  invalidAdjective: string,
): Range[] | null {
  const translatedRanges = ranges.map(({ start, end }) => ({
    start: translateOldLine(start, "start", translators),
    end: translateOldLine(end, "end", translators),
  }))

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

function translateOldLine(
  line: number,
  bound: "start" | "end",
  translators: LineTranslator[],
) {
  return translators.reduce((translated, t) => {
    const range = t.oldLine(translated)
    const newOffset = range.span === 0 && bound === "start" ? 1 : 0

    return range[bound] + newOffset
  }, line)
}

export function displayRange({ start, end }: Range): string {
  return start === end ? `${start}` : `${start}-${end}`
}
