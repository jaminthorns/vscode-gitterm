import { spawn } from "child_process"
import { basename } from "path"
import { createInterface } from "readline"
import * as vscode from "vscode"
import { Repository } from "./Repository"
import { RepositoryStore } from "./stores"
import { CommitFilenames, TerminalContext } from "./TerminalContext"
import { UserGitCommand } from "./UserGitCommand"

export function excludeNulls<T>(items: T[]): Exclude<T, null>[] {
  return items.filter((item) => item !== null) as Exclude<T, null>[]
}

export async function filterAsync<T>(
  items: T[] | readonly T[],
  predicate: (item: T) => Promise<boolean>,
): Promise<T[]> {
  const itemsAndConditions = await Promise.all(
    items.map(async (item) => ({ item, keep: await predicate(item) })),
  )

  return itemsAndConditions.filter(({ keep }) => keep).map(({ item }) => item)
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

export async function isDirectory(uri: vscode.Uri): Promise<boolean> {
  const { type } = await vscode.workspace.fs.stat(uri)
  return type === vscode.FileType.Directory
}

// Needed for opening URLs without encoding issues.
// https://github.com/microsoft/vscode/issues/85930
export async function openUrl(url: vscode.Uri): Promise<Boolean> {
  return await (
    vscode.env.openExternal as unknown as (target: string) => Thenable<boolean>
  )(url.toString())
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
    const stdoutData: Uint8Array[] = []
    const stderrData: Uint8Array[] = []
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

export interface GitCommandOptions extends CommandOptions {
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
  command,
  context,
  env,
  onClose,
}: {
  name: string
  icon: string
  cwd: vscode.Uri
  command: string
  context?: TerminalContext
  env?: Record<string, string>
  onClose?: Function
}) {
  const iconPath = new vscode.ThemeIcon(icon)
  const options = { name, iconPath, cwd, context, env }
  const terminal = vscode.window.createTerminal(options)

  if (onClose !== undefined) {
    const listener = vscode.window.onDidCloseTerminal((t) => {
      if (t === terminal) {
        onClose()
        listener.dispose()
      }
    })
  }

  terminal.show()
  terminal.sendText(command)
}

export function userGitCommand(command: UserGitCommand): string {
  const commandStr = vscode.workspace
    .getConfiguration("gitterm.gitCommands")
    .get(command.key) as string

  const matches = Array.from(commandStr.matchAll(/( *)\${(\w+)}( *)/g))
  const variables = command.variables as Record<string, string | string[]>

  return matches.reduce((commandStr, [substitution, lPad, name, rPad]) => {
    let variable = variables[name]
    const isString = typeof variable === "string"
    const isNonEmptyArray = Array.isArray(variable) && variable.length > 0

    if (isString || isNonEmptyArray) {
      if (Array.isArray(variable)) {
        variable = variable.join(" ")
      }

      return commandStr.replace(substitution, `${lPad}${variable}${rPad}`)
    } else {
      const noPad = `${lPad}${rPad}`.length === 0
      return commandStr.replace(substitution, noPad ? "" : " ")
    }
  }, commandStr)
}

export interface CommitFilenamesOptions {
  reverse?: boolean
  maxCount?: number
}

// Get a mapping of commits to historical filenames for every commit in which a
// given path was changed.
export async function commitFilenames(
  revision: string,
  path: string,
  directory: vscode.Uri,
  options: CommitFilenamesOptions = {},
): Promise<CommitFilenames | null> {
  try {
    const maxCount = options.maxCount
    const reverse = options.reverse ?? false

    const countArgs = maxCount !== undefined ? [`--max-count=${maxCount}`] : []
    const { revision: revisionArg, reverseFlags } = reverse
      ? reverseHistoryArgs(revision)
      : { revision, reverseFlags: [] }

    const args = [
      "--follow",
      "--name-only",
      "--format=%H",
      ...countArgs,
      ...reverseFlags,
      revisionArg,
      "--",
      path,
    ]

    const output = await git("log", args, { directory })

    return new Map(chunk(output.split(/\n+/), 2) as [string, string][])
  } catch (error) {
    return null
  }
}

export function reverseHistoryArgs(revision: string): {
  revision: string
  reverseFlags: string[]
} {
  return {
    revision: `${revision}..HEAD`,
    reverseFlags: ["--reverse", "--ancestry-path"],
  }
}

export function uriRevision(uri: vscode.Uri): string {
  if (uri.scheme === "file") {
    return "HEAD"
  } else if (
    uri.scheme === "git" ||
    uri.scheme === "git-commit" // This scheme is no longer used by VS Code, just this extension
  ) {
    const revision = JSON.parse(uri.query).ref
    return revision === "~" ? "HEAD" : revision
  } else if (uri.scheme === "scm-history-item" && uri.query !== "") {
    return JSON.parse(uri.query).historyItemId
  } else if (uri.scheme === "scm-history-item" && uri.query === "") {
    return basename(uri.path).split("..")[1]
  } else if (uri.scheme === "review") {
    return JSON.parse(uri.query).commit
  } else {
    throw Error(`Cannot get revision from URI: ${uri}`)
  }
}

// We actually probably don't need this
export function uriRevisionPath(uri: vscode.Uri): {
  revision: string
  path: string
} {
  if (uri.scheme === "file") {
    return {
      revision: "HEAD",
      path: vscode.workspace.asRelativePath(uri, false),
    }
  } else if (uri.scheme === "git" || uri.scheme === "git-commit") {
    const { ref, path } = JSON.parse(uri.query)

    return {
      revision: ref === "~" ? "HEAD" : ref,
      path: vscode.workspace.asRelativePath(path, false),
    }
  } else if (uri.scheme === "scm-history-item" && uri.query !== "") {
    return {
      revision: JSON.parse(uri.query).historyItemId,
      path: "",
    }
  } else if (uri.scheme === "scm-history-item" && uri.query === "") {
    return {
      revision: basename(uri.path).split("..")[1],
      path: "",
    }
  } else if (uri.scheme === "review") {
    const { commit, path } = JSON.parse(uri.query)

    return {
      revision: commit,
      path: vscode.workspace.asRelativePath(path, false),
    }
  } else {
    throw Error(`Cannot get revision from URI: ${uri}`)
  }
}

export async function getValidatedRepository(
  uri: vscode.Uri,
  repositories: RepositoryStore,
  noun: string,
): Promise<Repository | undefined> {
  const repository = repositories.getRepository(uri)
  const filename = vscode.workspace.asRelativePath(uri, false)

  if (repository === undefined) {
    vscode.window.showErrorMessage(`${noun} not in repository: ${filename}`)
    return
  }

  try {
    await git("ls-files", ["--error-unmatch", filename], {
      directory: repository.directory,
    })

    return repository
  } catch (error) {
    vscode.window.showErrorMessage(`${noun} not tracked: ${filename}`)
    return
  }
}
