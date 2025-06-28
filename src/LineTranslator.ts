import { GitCommandOptions, git } from "./util"

export interface LineRange {
  start: number
  end: number
}

interface LineSpan extends LineRange {
  lines: number
}

interface LineTranslation {
  old: LineSpan
  new: LineSpan
}

enum Position {
  Before,
  Inside,
  After,
}

export interface LineTranslator {
  oldSpan: (newLine: number) => LineSpan
  newSpan: (oldLine: number) => LineSpan
}

export function LineTranslator(diff: string): LineTranslator {
  const hunkMatches = Array.from(diff.matchAll(/^@@ (.*) @@/gm))

  const translations: LineTranslation[] = hunkMatches
    .map(([, hunkSpec]) => hunkSpec.split(" ").map(parseSpan))
    .map(([oldSpan, newSpan]) => ({ old: oldSpan, new: newSpan }))

  return {
    oldSpan: (newLine) => translateLine(newLine, translations, "new", "old"),
    newSpan: (oldLine) => translateLine(oldLine, translations, "old", "new"),
  }
}

function parseSpan(spanStr: string): LineSpan {
  const [startStr, linesStr = "1"] = spanStr.slice(1).split(",")

  return LineSpan(parseInt(startStr), parseInt(linesStr))
}

function LineSpan(start: number, lines: number): LineSpan {
  return { start, lines, end: start + Math.max(lines - 1, 0) }
}

function translateLine(
  line: number,
  translations: LineTranslation[],
  from: "old" | "new",
  to: "old" | "new",
): LineSpan {
  const insideTranslation = translations.find(
    ({ [from]: span }) => linePosition(line, span) === Position.Inside,
  )

  if (insideTranslation === undefined) {
    const beforeTranslations = translations.filter(
      ({ [from]: span }) => linePosition(line, span) === Position.After,
    )

    const beforeShift = beforeTranslations
      .map((translation) => translation[to].lines - translation[from].lines)
      .reduce((a, b) => a + b, 0)

    const start = line + beforeShift

    return LineSpan(start, 1)
  } else {
    return insideTranslation[to]
  }
}

function linePosition(line: number, span: LineSpan): Position {
  if (line < span.start) {
    return Position.Before
  } else if (line >= span.start && line <= span.end && span.lines > 0) {
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

LineTranslator.oldRangeAcross = function (
  { start, end }: LineRange,
  translators: LineTranslator[],
): LineRange {
  return {
    start: translateLineAcross(start, translators, "start", "oldSpan"),
    end: translateLineAcross(end, translators, "end", "oldSpan"),
  }
}

LineTranslator.newRangeAcross = function (
  { start, end }: LineRange,
  translators: LineTranslator[],
): LineRange {
  return {
    start: translateLineAcross(start, translators, "start", "newSpan"),
    end: translateLineAcross(end, translators, "end", "newSpan"),
  }
}

function translateLineAcross(
  line: number,
  translators: LineTranslator[],
  bound: "start" | "end",
  operation: "oldSpan" | "newSpan",
): number {
  return translators.reduce((translated, translator) => {
    const span = translator[operation](translated)
    const newOffset = span.lines === 0 && bound === "start" ? 1 : 0

    return span[bound] + newOffset
  }, line)
}
