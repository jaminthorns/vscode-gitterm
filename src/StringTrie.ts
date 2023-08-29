type StringTrieData = {
  terminal: boolean
  children: Map<string, StringTrieData>
}

export type Match = {
  startIndex: number
  text: string
}

export default class StringTrie {
  root: StringTrieData

  constructor() {
    this.root = { terminal: false, children: new Map() }
  }

  addStrings(strings: string[]) {
    for (const string of strings) {
      this.addString(string)
    }
  }

  addString(string: string, current: StringTrieData = this.root) {
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

      this.addString(rest, nextChild)
    }
  }

  findMatches(text: string): Match[] {
    let index = 0
    const characters = Array.from(text)
    const matches = []

    while (index < characters.length) {
      const string = text.slice(index)
      const match = this.#longestMatch(string)

      if (match === null) {
        index = index + 1
      } else {
        matches.push({ startIndex: index, text: match })
        index = index + match.length
      }
    }

    return matches
  }

  #longestMatch(
    string: string,
    processed: string = "",
    matched: string | null = null,
    current: StringTrieData = this.root,
  ): string | null {
    const first = string.slice(0, 1)
    const rest = string.slice(1)
    const nextChild = current.children.get(first)

    if (nextChild === undefined || first === "") {
      return matched
    } else {
      const nextProcessed = processed + first
      const nextMatched = nextChild.terminal ? nextProcessed : matched

      return this.#longestMatch(rest, nextProcessed, nextMatched, nextChild)
    }
  }
}
