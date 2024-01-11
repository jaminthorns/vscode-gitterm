import { spawn } from "child_process"
import { createInterface } from "readline"
import * as vscode from "vscode"
import { CommitFilenames, TerminalContext } from "./context"
import UserGitCommand from "./UserGitCommand"

export function excludeNulls<T>(items: T[]): Exclude<T, null>[] {
  return items.filter((item) => item !== null) as Exclude<T, null>[]
}

export function chunk<T>(array: T[], count: number): T[][] {
  return array.reduce((chunks: T[][], value, index) => {
    const chunkIndex = Math.floor(index / count)

    if (chunks[chunkIndex] === undefined) {
      chunks[chunkIndex] = []
    }

    chunks[chunkIndex].push(value)
    return chunks
  }, [])
}

export function truncate(text: string, maxLength: number): string {
  if (text.length > maxLength) {
    return text.slice(0, maxLength - 3) + "..."
  } else {
    return text
  }
}

interface CommandOptions {
  directory?: vscode.Uri
  stdin?: string
  ignoreNonZeroExitCode?: boolean
}

export async function run(
  command: string,
  args: string[],
  options: CommandOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdoutData: Buffer[] = []
    const stderrData: Buffer[] = []
    const process = spawn(command, args, { cwd: options.directory?.fsPath })

    if (options.stdin !== undefined) {
      process.stdin.end(options.stdin)
    }

    process.stdout.on("data", (data) => stdoutData.push(data))
    process.stderr.on("data", (data) => stderrData.push(data))

    process.on("close", (code) => {
      if (code === 0 || options.ignoreNonZeroExitCode) {
        const stdout = Buffer.concat(stdoutData).toString()
        resolve(stdout.trim())
      } else {
        const stderr = Buffer.concat(stderrData).toString()
        reject(new Error(stderr.trim()))
      }
    })
  })
}

export function streamCommand(
  command: string,
  args: string[],
  directory: vscode.Uri | undefined,
  onLineOutput: (output: string) => unknown,
) {
  const process = spawn(command, args, { cwd: directory?.fsPath })
  const readline = createInterface({ input: process.stdout, terminal: false })

  readline.on("line", onLineOutput)
}

interface GitCommandOptions extends CommandOptions {
  directory: vscode.Uri
}

export async function git(
  subCommand: string,
  args: string[],
  options: GitCommandOptions,
): Promise<string> {
  return await run("git", [subCommand, ...args], options)
}

export function runCommandInTerminal({
  name,
  icon,
  cwd,
  context,
  command,
}: {
  name: string
  icon: string
  cwd: vscode.Uri
  context: TerminalContext
  command: string
}) {
  const iconPath = new vscode.ThemeIcon(icon)
  const options = { name, iconPath, cwd, context }
  const terminal = vscode.window.createTerminal(options)

  terminal.show()
  terminal.sendText(command)
}

export function userGitCommand(command: UserGitCommand): string {
  const commandStr = vscode.workspace
    .getConfiguration("gitterm.gitCommands")
    .get(command.key) as string

  const matches = Array.from(commandStr.matchAll(/\${(\w+)}/g))
  const variables = command.variables as Record<string, any>

  return matches.reduce((commandStr, [substitution, variableName]) => {
    return commandStr.replace(substitution, variables[variableName])
  }, commandStr)
}

// Get a mapping of commits to historical filenames for every commit in which a
// given path was changed
export async function commitFilenames(
  path: string,
  directory: vscode.Uri,
): Promise<CommitFilenames | null> {
  try {
    const args = ["--follow", "--name-only", "--format=%H", "--", path]
    const output = await git("log", args, { directory })

    return new Map(chunk(output.split(/\n+/), 2) as [string, string][])
  } catch (error) {
    return null
  }
}

export async function lineTranslationDiff(
  args: string[],
  options: GitCommandOptions,
) {
  return await git("diff", ["--unified=0", ...args], options)
}
