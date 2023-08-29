type StringTrieData = {
  terminal: boolean
  children: Map<string, StringTrieData>
}

type Match = {
  startIndex: number
  text: string
}

export default interface StringTrie {
  addStrings(strings: string[]): void
  findMatches(text: string): Match[]
}

export default function StringTrie(): StringTrie {
  const root: StringTrieData = { terminal: false, children: new Map() }

  return {
    addStrings(strings) {
      for (const string of strings) {
        addString(string, root)
      }
    },

    findMatches(text) {
      let index = 0
      const characters = Array.from(text)
      const matches = []

      while (index < characters.length) {
        const string = text.slice(index)
        const match = longestMatch(string, root)

        if (match === null) {
          index = index + 1
        } else {
          matches.push({ startIndex: index, text: match })
          index = index + match.length
        }
      }

      return matches
    },
  }
}

function addString(string: string, current: StringTrieData) {
  const first = string.slice(0, 1)
  const rest = string.slice(1)
  const terminal = first === ""

  if (terminal) {
    current.terminal = true
  } else {
    let nextChild = current.children.get(first)

    if (nextChild === undefined) {
      nextChild = { terminal, children: new Map() }
      current.children.set(first, nextChild)
    }

    addString(rest, nextChild)
  }
}

function longestMatch(
  string: string,
  current: StringTrieData,
  processed: string = "",
  matched: string | null = null,
): string | null {
  const first = string.slice(0, 1)
  const rest = string.slice(1)
  const nextChild = current.children.get(first)

  if (nextChild === undefined || first === "") {
    return matched
  } else {
    const nextProcessed = processed + first
    const nextMatched = nextChild.terminal ? nextProcessed : matched

    return longestMatch(rest, nextChild, nextProcessed, nextMatched)
  }
}
