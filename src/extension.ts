import * as vscode from "vscode"
import { basename } from "path"
import { exec } from "child_process"

interface Commit {
  full: string
  abbreviated: string
}

interface CommitContext {
  commit: Commit
}

interface PathContext {
  path: string
  commitPaths: ReturnType<typeof commitPaths>
}

interface CommitTerminalLink extends vscode.TerminalLink {
  context: CommitContext & Partial<PathContext>
}

async function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const folders = vscode.workspace.workspaceFolders

    if (folders !== undefined && folders[0]) {
      const folder = folders[0]

      exec(`cd ${folder.uri.fsPath} && ${command}`, (error, stdout, stderr) => {
        if (error === null) {
          resolve(stdout.trim())
        } else {
          reject(stderr.trim())
        }
      })
    } else {
      reject("No folders are opened in this workspace")
    }
  })
}

async function parseCommit(raw: string): Promise<Commit | null> {
  try {
    const [full, abbreviated] = await Promise.all([
      runCommand(`git rev-parse '${raw}'`),
      runCommand(`git rev-parse --short '${raw}'`),
    ])

    return { full, abbreviated }
  } catch (error) {
    return null
  }
}

function chunk<T>(array: T[], count: number): T[][] {
  return array.reduce((chunks: T[][], value, index) => {
    const chunkIndex = Math.floor(index / count)

    if (chunks[chunkIndex] === undefined) {
      chunks[chunkIndex] = []
    }

    chunks[chunkIndex].push(value)
    return chunks
  }, [])
}

// Get a mapping that provides historical paths by commit for a given path.
async function commitPaths(path: string): Promise<Map<string, string> | null> {
  try {
    const commitPaths = await runCommand(
      `git log --follow --name-only --format="%H" -- '${path}'`,
    )

    return new Map(chunk(commitPaths.split(/\n+/), 2) as [string, string][])
  } catch (error) {
    return null
  }
}

function runCommandInTerminal<Context>({
  name,
  icon,
  context,
  command,
}: {
  name: string
  icon: string
  context: Context
  command: string
}) {
  const iconPath = new vscode.ThemeIcon(icon)
  const options = { name, iconPath, context }
  const terminal = vscode.window.createTerminal(options)

  terminal.show()
  terminal.sendText(command)
}

const CONFIG_VARIABLE_PATTERN = /\${(\w+)}/g

function gitCommand(commandKey: string, context: Record<string, any>): string {
  let command = vscode.workspace
    .getConfiguration("gitterm.gitCommands")
    .get(commandKey) as string

  const matches = Array.from(command.matchAll(CONFIG_VARIABLE_PATTERN))

  return matches.reduce((command, [substitution, contextKey]) => {
    return command.replace(substitution, context[contextKey])
  }, command)
}

export function activate(context: vscode.ExtensionContext) {
  const fileHistory = vscode.commands.registerTextEditorCommand(
    "gitterm.fileHistory",
    ({ document }: vscode.TextEditor) => {
      const path = vscode.workspace.asRelativePath(document.uri)
      const file = basename(path)
      const context: PathContext = { path, commitPaths: commitPaths(path) }

      runCommandInTerminal({
        name: `History: ${file}`,
        icon: "history",
        command: gitCommand("fileHistory", { path }),
        context,
      })
    },
  )

  const lineHistory = vscode.commands.registerTextEditorCommand(
    "gitterm.lineHistory",
    ({ selection, document }: vscode.TextEditor) => {
      const startLine = selection.start.line + 1
      const endLine = selection.end.line + 1
      const lineRange = `${startLine},${endLine}`
      const lineSuffix = startLine === endLine ? startLine : lineRange

      const path = vscode.workspace.asRelativePath(document.uri)
      const file = basename(path)
      const context: PathContext = { path, commitPaths: commitPaths(path) }

      runCommandInTerminal({
        name: `History: ${file}:${lineSuffix}`,
        icon: "history",
        command: gitCommand("lineHistory", { path, startLine, endLine }),
        context,
      })
    },
  )

  const fileBlame = vscode.commands.registerTextEditorCommand(
    "gitterm.fileBlame",
    ({ document }: vscode.TextEditor) => {
      const path = vscode.workspace.asRelativePath(document.uri)
      const file = basename(path)
      const context: PathContext = { path, commitPaths: commitPaths(path) }

      runCommandInTerminal({
        name: `Blame: ${file}`,
        icon: "person",
        command: gitCommand("fileBlame", { path }),
        context,
      })
    },
  )

  const commitLinkProvider = vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<CommitTerminalLink[]> {
      const options = terminal.creationOptions
      const context = "context" in options ? (options.context as object) : {}
      const lineMatches = Array.from(line.matchAll(/([0-9a-f]{7,40})/g))

      const possibleMatches = await Promise.all(
        lineMatches.map(async ([match, rawCommit]) => {
          const commit = await parseCommit(rawCommit)

          if (commit === null) {
            return null
          } else {
            const matchStart = line.indexOf(match)
            const startIndex = matchStart + match.indexOf(rawCommit)

            return {
              startIndex,
              length: rawCommit.length,
              tooltip: "Pick a commit action",
              context: { ...context, commit },
            }
          }
        }),
      )

      return possibleMatches.filter((l) => l !== null) as CommitTerminalLink[]
    },

    async handleTerminalLink({ context }: CommitTerminalLink) {
      const { commit, path, commitPaths } = context
      const placeHolder = `Select an action for commit ${commit.abbreviated}`

      const commitPath =
        path !== undefined && commitPaths !== undefined
          ? (await commitPaths)?.get(commit.full) ?? null
          : null

      const commitItems = [
        {
          label: "$(git-commit) Show Commit",
          onSelected: () => {
            runCommandInTerminal({
              name: `Commit: ${commit.abbreviated}`,
              icon: "git-commit",
              command: gitCommand("showCommit", { commit: commit.full }),
              context: { commit },
            })
          },
        },
        {
          label: "$(files) Copy Commit to Clipboard",
          onSelected: () => {
            vscode.env.clipboard.writeText(commit.full)
          },
        },
      ]

      let selectedItem

      if (commitPath === null) {
        selectedItem = await vscode.window.showQuickPick(commitItems, {
          placeHolder,
        })
      } else {
        const file = basename(commitPath)
        const context = { commit, path: commitPath }
        const commandContext = { commit: commit.full, path: commitPath }

        const fileItems = [
          {
            label: "$(git-compare) Show File Diff",
            description: commitPath,
            onSelected: () => {
              runCommandInTerminal({
                name: `Diff: ${file} (${commit.abbreviated})`,
                icon: "git-compare",
                context,
                command: gitCommand("showFileDiffAtCommit", commandContext),
              })
            },
          },
          {
            label: "$(file) Show File at Commit",
            description: commitPath,
            onSelected: () => {
              runCommandInTerminal({
                name: `File: ${file} (${commit.abbreviated})`,
                icon: "file",
                context,
                command: gitCommand("showFileContentsAtCommit", commandContext),
              })
            },
          },
        ]

        selectedItem = await vscode.window.showQuickPick(
          [...commitItems, ...fileItems],
          { placeHolder },
        )
      }

      selectedItem?.onSelected()
    },
  })

  context.subscriptions.push(
    fileHistory,
    lineHistory,
    fileBlame,
    commitLinkProvider,
  )
}

export function deactivate() {}
