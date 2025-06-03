import * as vscode from "vscode"
import { Commit } from "../Commit"
import { SelectableQuickPickItem } from "../quickPick"
import { RemoteProvider } from "../remoteProviders"
import { Repository } from "../Repository"
import { git } from "../util"

export function relativeGitUri(
  filename: string,
  commit: Commit | null,
  directory: vscode.Uri,
): vscode.Uri {
  const uri = vscode.Uri.joinPath(directory, filename)
  const ref = commit?.full ?? "0000000000000000000000000000000000000000"

  return vscode.Uri.from({
    scheme: "git",
    path: uri.path,
    query: JSON.stringify({ path: uri.fsPath, ref }),
  })
}

export async function commitRemotes(
  commit: Commit,
  repository: Repository,
): Promise<RemoteProvider[]> {
  const remoteProviders = repository.remoteProviders.sorted()

  if (remoteProviders.length === 0) {
    return []
  }

  // The performance of checking whether every remote branch contains a commit
  // becomes noticeably slow in repositories with long history and many remote
  // branches.
  const args = ["-r", "--contains", commit.full]
  const output = await git("branch", args, { directory: repository.directory })
  const branches = output.split("\n").map((b) => b.trim())

  return remoteProviders.filter(({ remote }) => {
    const match = branches.find((b) => b.startsWith(remote.name))
    return match !== undefined
  })
}

type ShowOption = "editor" | "terminal"

interface ShowOptions {
  tooltip: string
  onSelected: () => void
}

const showIcons = {
  editor: "go-to-file",
  terminal: "terminal",
}

export function showItem({
  item,
  configKey,
  showOptions,
}: {
  item: SelectableQuickPickItem
  configKey: string
  showOptions: Record<ShowOption, ShowOptions>
}) {
  const showDefault = vscode.workspace
    .getConfiguration("gitterm.showDefault")
    .get(configKey) as ShowOption
  const showSecondary = showDefault === "editor" ? "terminal" : "editor"
  const showDefaultOptions = showOptions[showDefault]
  const showSecondaryOptions = showOptions[showSecondary]

  return {
    ...item,
    onSelected: showDefaultOptions.onSelected,
    buttons: [
      {
        tooltip: showSecondaryOptions.tooltip,
        iconPath: new vscode.ThemeIcon(showIcons[showSecondary]),
        onSelected: showSecondaryOptions.onSelected,
      },
    ],
  }
}
