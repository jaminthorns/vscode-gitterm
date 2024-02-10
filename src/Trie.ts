type Children<Value> = Map<string, Node<Value>>

type NonTerminalNode<Value> = {
  terminal: false
  children: Children<Value>
}

type TerminalNode<Value> = {
  terminal: true
  value: Value
  children: Children<Value>
}

type Node<Value> = NonTerminalNode<Value> | TerminalNode<Value>

type Entry<Value> = [string, Value]

type Match<Value> = {
  startIndex: number
  text: string
  value: Value
}

type Updater<Value> = (value: Value | undefined) => Value

export default interface Trie<Value> {
  entries(): Entry<Value>[]
  set(key: string, value: Value): void
  update(key: string, updater: Updater<Value>): Value
  delete(key: string): void
  findMatches(text: string): Match<Value>[]
}

export default function Trie<Value>(): Trie<Value> {
  const root: Node<Value> = { terminal: false, children: new Map() }

  return {
    entries() {
      return getEntries(root, "", [])
    },

    set(key, value) {
      doUpdate(key, () => value, root)
    },

    update(key, updater) {
      return doUpdate(key, updater, root)
    },

    delete(key) {
      doDelete(key, root)
    },

    findMatches(text) {
      const characters = Array.from(text)
      const matches = []

      for (let index = 0; index < characters.length; index++) {
        const string = text.slice(index)
        const match = longestMatch(string, root)

        if (match !== null) {
          matches.push({
            startIndex: index,
            text: match.text,
            value: match.value,
          })
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

function getEntries<Value>(
  current: Node<Value>,
  prefix: string,
  entries: Entry<Value>[],
): Entry<Value>[] {
  for (const [part, child] of current.children.entries()) {
    const string = prefix + part

    if (child.terminal) {
      entries.push([string, child.value])
    }

    getEntries(child, string, entries)
  }

  return entries
}

function doUpdate<Value>(
  key: string,
  updater: Updater<Value>,
  current: Node<Value>,
): Value {
  const first = key.slice(0, 1)
  const rest = key.slice(1)
  const terminal = first === ""

  if (terminal) {
    const value = current.terminal ? current.value : undefined
    const updated = updater(value)

    Object.assign(current, { terminal: true, value: updated })

    return updated
  } else {
    let nextChild = current.children.get(first)

    if (nextChild === undefined) {
      nextChild = { terminal: false, children: new Map() }
      current.children.set(first, nextChild)
    }

    return doUpdate(rest, updater, nextChild)
  }
}

// This removes the terminal entry for a string, but it doesn't prune the tree.
function doDelete<Value>(string: string, current: Node<Value>) {
  const first = string.slice(0, 1)
  const rest = string.slice(1)
  const terminal = first === ""

  if (terminal) {
    current.terminal = false
  } else {
    let nextChild = current.children.get(first)

    if (nextChild !== undefined) {
      doDelete(rest, nextChild)
    }
  }
}

function longestMatch<Value>(
  string: string,
  current: Node<Value>,
  processed: string = "",
): { text: string; value: Value } | null {
  const first = string.slice(0, 1)
  const rest = string.slice(1)
  const nextChild = current.children.get(first)

  const endOfTrie = nextChild === undefined
  const endOfString = first === ""

  if (endOfTrie || endOfString) {
    return current.terminal ? { text: processed, value: current.value } : null
  } else {
    return longestMatch(rest, nextChild, processed + first)
  }
}

function overlaps<Value>(a: Match<Value>, b: Match<Value>) {
  const aEndIndex = a.startIndex + a.text.length - 1
  const bEndIndex = b.startIndex + b.text.length - 1

  return aEndIndex >= b.startIndex && bEndIndex >= a.startIndex
}
