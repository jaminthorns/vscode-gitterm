import { basename } from "path"
import * as vscode from "vscode"
import StringTrie from "./StringTrie"
import { runCommand, streamCommand } from "./util"

export default class FilenameStore {
  filenames: StringTrie
  initialCommit: string | null

  constructor(gitDir: vscode.Uri) {
    this.filenames = new StringTrie()
    this.initialCommit = null

    this.#setInitialCommit()
    this.#loadInitialFilenames()
    this.#setupRefWatcher(gitDir)
  }

  async #setInitialCommit() {
    this.initialCommit = await runCommand("git rev-parse HEAD")
  }

  async #loadInitialFilenames() {
    this.#loadFilenames()
  }

  #setupRefWatcher(gitDir: vscode.Uri) {
    const headFile = vscode.Uri.joinPath(gitDir, "refs")
    const headPattern = new vscode.RelativePattern(headFile, "**/*")
    const headWatcher = vscode.workspace.createFileSystemWatcher(headPattern)

    headWatcher.onDidCreate(async (uri) => {
      if (basename(uri.fsPath) !== "HEAD") {
        const content = await vscode.workspace.fs.readFile(uri)
        const commit = content.toString().trim()

        this.#loadFilenames(`${this.initialCommit}...${commit}`)
      }
    })
  }

  async #loadFilenames(range?: string) {
    let args = ["--all", "--format=", "--name-only", "--diff-filter=AR"]
    args = range === undefined ? args : [range, ...args]

    streamCommand("git", ["log", ...args], (output) => {
      this.filenames.addStrings(output.split("\n"))
    })
  }
}
