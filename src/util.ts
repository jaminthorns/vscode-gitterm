import { spawn } from "child_process"
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

export async function runCommand(
  command: string,
  args: string[],
  directory?: vscode.Uri,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdoutData: Buffer[] = []
    const stderrData: Buffer[] = []
    const process = spawn(command, args, { cwd: directory?.fsPath })

    process.stdout.on("data", (data) => stdoutData.push(data))
    process.stderr.on("data", (data) => stderrData.push(data))

    process.on("close", (code) => {
      if (code === 0) {
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
  onOutput: (output: string) => unknown,
) {
  const process = spawn(command, args, { cwd: directory?.fsPath })
  process.stdout.on("data", (data) => onOutput(data.toString()))
}

export async function runGitCommand(
  subCommand: string,
  directory: vscode.Uri,
  args: string[],
): Promise<string> {
  return await runCommand("git", [subCommand, ...args], directory)
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
  let commandStr = vscode.workspace
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
    const output = await runGitCommand("log", directory, args)

    return new Map(chunk(output.split(/\n+/), 2) as [string, string][])
  } catch (error) {
    return null
  }
}
