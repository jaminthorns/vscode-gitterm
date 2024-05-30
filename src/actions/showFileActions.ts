import { existsSync } from "fs"
import { basename } from "path"
import * as vscode from "vscode"
import { Commit } from "../Commit"
import { SelectableQuickPickItem, showSelectableQuickPick } from "../quickPick"
import { Repository } from "../Repository"
import {
  commitFilenames,
  excludeNulls,
  runCommandInTerminal,
  userGitCommand,
} from "../util"
import { commitRemotes } from "./common"
import { fileAtCommitItems } from "./fileAtCommitItems"

export function showFileActions(
  repository: Repository,
  filename: string,
  commit?: Commit,
) {
  const uri = vscode.Uri.joinPath(repository.directory, filename)
  const exists = existsSync(uri.fsPath)
  const fileLabel = basename(filename)

  const openItem: SelectableQuickPickItem | null = exists
    ? {
        label: "$(go-to-file) Open File",
        onSelected: async () => {
          await vscode.window.showTextDocument(uri)
        },
      }
    : null

  const fileItems: SelectableQuickPickItem[] = excludeNulls([
    {
      label: fileLabel,
      kind: vscode.QuickPickItemKind.Separator,
    },
    openItem,
    {
      label: "$(clippy) Copy File Path",
      onSelected: () => {
        vscode.env.clipboard.writeText(filename)
      },
    },
    {
      label: "$(history) File History",
      onSelected: () => {
        runCommandInTerminal({
          name: fileLabel,
          icon: "history",
          cwd: repository.directory,
          command: userGitCommand({
            key: "fileHistory",
            variables: { revision: "HEAD", filename },
          }),
          context: {
            commit,
            filename,
            commitFilenames: commitFilenames(
              "HEAD",
              filename,
              repository.directory,
            ),
          },
        })
      },
    },
  ])

  let fileCommitItems: SelectableQuickPickItem[] = []

  if (commit !== undefined) {
    const remotes = commitRemotes(commit, repository)

    fileCommitItems = fileAtCommitItems(repository, remotes, commit, filename)
  }

  showSelectableQuickPick({
    placeholder: "Select an action",
    items: [...fileItems, ...fileCommitItems],
  })
}
