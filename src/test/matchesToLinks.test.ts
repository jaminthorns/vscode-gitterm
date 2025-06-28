import { deepEqual } from "assert/strict"
import {
  LinkMatchWithType,
  LinkMatcherType,
  matchesToLinks,
} from "../terminalLinkProvider"

suite("matchesToLinks", () => {
  test("separate links (not touching)", () => {
    const a = match("localBranch", 0, 5)
    const b = match("localBranch", 7, 5)

    deepEqual(discardTooltips(matchesToLinks([a, b])), [
      { startIndex: a.startIndex, length: a.length, matches: [a] },
      { startIndex: b.startIndex, length: b.length, matches: [b] },
    ])
  })

  test("separate links (touching)", () => {
    const a = match("localBranch", 0, 5)
    const b = match("localBranch", 5, 5)

    deepEqual(discardTooltips(matchesToLinks([a, b])), [
      { startIndex: a.startIndex, length: a.length, matches: [a] },
      { startIndex: b.startIndex, length: b.length, matches: [b] },
    ])
  })

  test("overlapping links (outer wins)", () => {
    const a = match("file", 0, 5)
    const b = match("localBranch", 1, 3)

    deepEqual(discardTooltips(matchesToLinks([a, b])), [
      { startIndex: a.startIndex, length: a.length, matches: [a] },
    ])
  })

  test("overlapping links (earlier wins)", () => {
    const a = match("localBranch", 0, 5)
    const b = match("remoteBranch", 3, 5)

    deepEqual(discardTooltips(matchesToLinks([a, b])), [
      { startIndex: a.startIndex, length: a.length, matches: [a] },
    ])
  })

  test("equal links", () => {
    const a = match("localBranch", 0, 5)
    const b = match("remoteBranch", 0, 5)

    deepEqual(discardTooltips(matchesToLinks([a, b])), [
      { startIndex: a.startIndex, length: a.length, matches: [a, b] },
    ])
  })
})

function match(
  type: LinkMatcherType,
  startIndex: number,
  length: number,
): LinkMatchWithType<null> {
  return { type, startIndex, length, context: null }
}

function discardTooltips<T>(matches: (T & { tooltip?: string })[]): T[] {
  matches.forEach((match) => {
    delete match.tooltip
  })

  return matches
}
