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
      const characters = Array.from(text)
      const matches = []

      for (let index = 0; index < characters.length; index++) {
        const string = text.slice(index)
        const match = longestMatch(string, root)

        if (match !== null) {
          matches.push({ startIndex: index, text: match })
        }
      }

      return matches.filter((match, index, all) => {
        const overlapping = all
          .filter((m) => overlaps(match, m))
          .sort((a, b) => b.text.length - a.text.length)

        return match === overlapping[0]
      })
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

function overlaps(a: Match, b: Match) {
  const aEndIndex = a.startIndex + a.text.length - 1
  const bEndIndex = b.startIndex + b.text.length - 1

  return aEndIndex >= b.startIndex && bEndIndex >= a.startIndex
}
