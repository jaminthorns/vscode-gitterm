import { deepEqual } from "assert/strict"
import StringTrie from "../../StringTrie"

suite("StringTrie adding/removing", () => {
  test("add a string", () => {
    const trie = StringTrie<null>()

    deepEqual(trie.findMatches("abc"), [])

    trie.addString("abc", null)

    deepEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: null },
    ])
  })

  test("remove a string", () => {
    const trie = StringTrie<null>()

    trie.addString("abc", null)
    trie.addString("xyz", null)

    deepEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: null },
    ])

    trie.removeString("abc")

    deepEqual(trie.findMatches("abc"), [])
  })
})

suite("StringTrie matching", () => {
  const trie = StringTrie<null>()

  trie.addString("abc", null)
  trie.addString("a", null)
  trie.addString("bc", null)
  trie.addString("ade", null)
  trie.addString("cdefg", null)
  trie.addString("xyz", null)

  test("no matching members, no match", () => {
    deepEqual(trie.findMatches("xy"), [])
  })

  test("single matching member, single match", () => {
    deepEqual(trie.findMatches("xyz"), [
      { startIndex: 0, text: "xyz", value: null },
    ])
  })

  test("multiple matching members (overlapping, contained), single match", () => {
    deepEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: null },
    ])
  })

  test("multiple matching members (overlapping, not contained), single match", () => {
    deepEqual(trie.findMatches("abcdefg"), [
      { startIndex: 2, text: "cdefg", value: null },
    ])
  })

  test("multiple matching members, multiple matches", () => {
    deepEqual(trie.findMatches("abc xyz"), [
      { startIndex: 0, text: "abc", value: null },
      { startIndex: 4, text: "xyz", value: null },
    ])
  })

  test("get entries", () => {
    deepEqual(trie.getEntries(), [
      ["a", null],
      ["abc", null],
      ["ade", null],
      ["bc", null],
      ["cdefg", null],
      ["xyz", null],
    ])
  })
})
