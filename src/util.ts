import * as vscode from "vscode"
import { exec, spawn } from "child_process"
import { Commit, CommitFilenames } from "./types"

function currentFolder(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath
}

export async function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: currentFolder() }, (error, stdout, stderr) => {
      if (error === null) {
        resolve(stdout.trim())
      } else {
        reject(stderr.trim())
      }
    })
  })
}

export function streamCommand(
  command: string,
  args: string[],
  onOutput: (output: string) => unknown,
) {
  const process = spawn(command, args, { cwd: currentFolder() })
  process.stdout.on("data", (data) => onOutput(data.toString()))
}

export async function parseCommit(raw: string): Promise<Commit | null> {
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
export async function commitFilenames(
  path: string,
): Promise<CommitFilenames | null> {
  try {
    const output = await runCommand(
      `git log --follow --name-only --format='%H' -- '${path}'`,
    )

    return new Map(chunk(output.split(/\n+/), 2) as [string, string][])
  } catch (error) {
    return null
  }
}

export function runCommandInTerminal<Context>({
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

export function gitCommand(
  commandKey: string,
  context: Record<string, any>,
): string {
  let command = vscode.workspace
    .getConfiguration("gitterm.gitCommands")
    .get(commandKey) as string

  const matches = Array.from(command.matchAll(CONFIG_VARIABLE_PATTERN))

  return matches.reduce((command, [substitution, contextKey]) => {
    return command.replace(substitution, context[contextKey])
  }, command)
}
