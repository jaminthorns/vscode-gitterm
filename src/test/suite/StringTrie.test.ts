import { deepStrictEqual } from "assert"
import StringTrie from "../../StringTrie"

suite("StringTrie", () => {
  const trie = StringTrie()

  trie.addStrings(["abc", "a", "bc", "ade", "cdefg", "xyz"])

  test("no matching members, no match", () => {
    deepStrictEqual(trie.findMatches("xy"), [])
  })

  test("single matching member, single match", () => {
    deepStrictEqual(trie.findMatches("xyz"), [{ startIndex: 0, text: "xyz" }])
  })

  test("multiple matching members (overlapping, contained), single match", () => {
    deepStrictEqual(trie.findMatches("abc"), [{ startIndex: 0, text: "abc" }])
  })

  test("multiple matching members (overlapping, not contained), single match", () => {
    deepStrictEqual(trie.findMatches("abcdefg"), [
      { startIndex: 2, text: "cdefg" },
    ])
  })

  test("multiple matching members, multiple matches", () => {
    deepStrictEqual(trie.findMatches("abc xyz"), [
      { startIndex: 0, text: "abc" },
      { startIndex: 4, text: "xyz" },
    ])
  })
})
