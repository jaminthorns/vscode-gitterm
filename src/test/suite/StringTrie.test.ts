import { deepEqual } from "assert"
import StringTrie from "../../StringTrie"

suite("StringTrie adding/removing", () => {
  test("add a string", () => {
    const trie = StringTrie()

    deepEqual(trie.findMatches("abc"), [])

    trie.addString("abc")

    deepEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: undefined },
    ])
  })

  test("remove a string", () => {
    const trie = StringTrie()

    trie.addString("abc")
    trie.addString("xyz")

    deepEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: undefined },
    ])

    trie.removeString("abc")

    deepEqual(trie.findMatches("abc"), [])
  })
})

suite("StringTrie matching", () => {
  const trie = StringTrie()

  trie.addString("abc")
  trie.addString("a")
  trie.addString("bc")
  trie.addString("ade")
  trie.addString("cdefg")
  trie.addString("xyz")

  test("no matching members, no match", () => {
    deepEqual(trie.findMatches("xy"), [])
  })

  test("single matching member, single match", () => {
    deepEqual(trie.findMatches("xyz"), [
      { startIndex: 0, text: "xyz", value: undefined },
    ])
  })

  test("multiple matching members (overlapping, contained), single match", () => {
    deepEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: undefined },
    ])
  })

  test("multiple matching members (overlapping, not contained), single match", () => {
    deepEqual(trie.findMatches("abcdefg"), [
      { startIndex: 2, text: "cdefg", value: undefined },
    ])
  })

  test("multiple matching members, multiple matches", () => {
    deepEqual(trie.findMatches("abc xyz"), [
      { startIndex: 0, text: "abc", value: undefined },
      { startIndex: 4, text: "xyz", value: undefined },
    ])
  })

  test("reconstruct all strings", () => {
    deepEqual(trie.getStrings(), ["a", "abc", "ade", "bc", "cdefg", "xyz"])
  })
})
