import * as vscode from "vscode"
import { spawn } from "child_process"
import StringTrie from "./StringTrie"
import { fileBlame, fileHistory, lineHistory } from "./commands"
import { commitLinkProvider, fileLinkProvider } from "./linkProviders"
import { streamCommand } from "./util"

export function activate(context: vscode.ExtensionContext) {
  const filenames = new StringTrie()
  const args = ["log", "--all", "--format=", "--name-only", "--diff-filter=AR"]

  streamCommand("git", args, (output) => {
    filenames.addStrings(output.split("\n"))
  })

  context.subscriptions.push(
    fileHistory,
    lineHistory,
    fileBlame,
    commitLinkProvider,
    fileLinkProvider(filenames),
  )
}

export function deactivate() {}
