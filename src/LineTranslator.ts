import { GitCommandOptions, git } from "./util"

interface LineRange {
  start: number
  end: number
  span: number
}

interface LineTranslation {
  old: LineRange
  new: LineRange
}

enum Position {
  Before,
  Inside,
  After,
}

export interface LineTranslator {
  oldLine: (newLine: number) => LineRange
  newLine: (oldLine: number) => LineRange
}

export function LineTranslator(diff: string): LineTranslator {
  const hunkMatches = Array.from(diff.matchAll(/^@@ (.*) @@/gm))

  const translations: LineTranslation[] = hunkMatches
    .map(([, hunkSpec]) => hunkSpec.split(" ").map(parseRange))
    .map(([oldRange, newRange]) => ({ old: oldRange, new: newRange }))

  return {
    oldLine: (newLine) => translateLine(newLine, translations, "new", "old"),
    newLine: (oldLine) => translateLine(oldLine, translations, "old", "new"),
  }
}

function parseRange(rangeStr: string): LineRange {
  const [start, span = "1"] = rangeStr.slice(1).split(",")

  return LineRange(parseInt(start), parseInt(span))
}

function LineRange(start: number, span: number): LineRange {
  return { start, span, end: start + Math.max(span - 1, 0) }
}

function translateLine(
  line: number,
  translations: LineTranslation[],
  from: "old" | "new",
  to: "old" | "new",
): LineRange {
  const insideTranslation = translations.find(
    ({ [from]: range }) => linePosition(line, range) === Position.Inside,
  )

  if (insideTranslation === undefined) {
    const beforeTranslations = translations.filter(
      ({ [from]: range }) => linePosition(line, range) === Position.After,
    )

    const beforeShift = beforeTranslations
      .map((translation) => translation[to].span - translation[from].span)
      .reduce((a, b) => a + b, 0)

    const start = line + beforeShift

    return LineRange(start, 1)
  } else {
    return insideTranslation[to]
  }
}

function linePosition(line: number, range: LineRange): Position {
  if (line < range.start) {
    return Position.Before
  } else if (line >= range.start && line <= range.end && range.span > 0) {
    return Position.Inside
  } else {
    return Position.After
  }
}

LineTranslator.fromDiff = async function (
  gitDiffArgs: string[],
  gitOptions: GitCommandOptions,
): Promise<LineTranslator> {
  const diff = await git("diff", ["--unified=0", ...gitDiffArgs], gitOptions)
  return LineTranslator(diff)
}
