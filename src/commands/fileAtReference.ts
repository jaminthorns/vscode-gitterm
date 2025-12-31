import { basename } from "path"
import * as vscode from "vscode"
import { relativeGitUri, showItem } from "../actions/common"
import { Commit } from "../Commit"
import { SelectableQuickPickItem, showSelectableQuickPick } from "../quickPick"
import { ReferenceType, referenceInfo } from "../references"
import { Repository } from "../Repository"
import { ReferenceStore, RepositoryStore } from "../stores"
import {
  getValidatedRepository,
  git,
  runCommandInTerminal,
  userGitCommand,
} from "../util"

export async function fileAtReference(
  uri: vscode.Uri,
  repositories: RepositoryStore,
) {
  const repository = await getValidatedRepository(uri, repositories, "File")

  if (repository === undefined) {
    return
  }

  const currentBranch = await getCurrentBranch(repository)

  const currentBranchItems = []
  const localBranchItems = referenceItems(
    repository.localBranches,
    "localBranch",
    uri,
    repository,
  )
  const remoteBranchItems = referenceItems(
    repository.remoteBranches,
    "remoteBranch",
    uri,
    repository,
  )
  const tagItems = referenceItems(repository.tags, "tag", uri, repository)

  const currentBranchIndex = localBranchItems.findIndex(
    (item) => "label" in item && item.label === currentBranch,
  )

  if (currentBranchIndex !== -1) {
    const [currentBranchItem] = localBranchItems.splice(currentBranchIndex, 1)

    currentBranchItems.push(
      { label: "Current Branch", kind: vscode.QuickPickItemKind.Separator },
      currentBranchItem,
    )
  }

  const items = [
    ...currentBranchItems,
    { label: "Branches", kind: vscode.QuickPickItemKind.Separator },
    ...localBranchItems,
    { label: "Remote Branches", kind: vscode.QuickPickItemKind.Separator },
    ...remoteBranchItems,
    { label: "Tags", kind: vscode.QuickPickItemKind.Separator },
    ...tagItems,
  ]

  showSelectableQuickPick({
    placeholder: "Select a reference",
    items,
  })
}

async function getCurrentBranch(repository: Repository) {
  return await git("branch", ["--show-current"], {
    directory: repository.directory,
  })
}

function referenceItems(
  references: ReferenceStore,
  type: ReferenceType,
  uri: vscode.Uri,
  repository: Repository,
): SelectableQuickPickItem[] {
  const filename = vscode.workspace.asRelativePath(uri, false)
  const { icon, label } = referenceInfo[type]

  return references.entries().map(([reference]) => {
    const fileLabel = `${basename(filename)} (${reference})`

    return showItem({
      item: {
        label: reference,
        iconPath: new vscode.ThemeIcon(icon),
      },
      configKey: "fileAtRevision",
      showOptions: {
        editor: {
          tooltip: `Open File at ${label} (Editor)`,
          onSelected: async () => {
            const commit = await Commit(reference, repository.directory)
            const uri = relativeGitUri(filename, commit, repository.directory)

            vscode.commands.executeCommand("vscode.open", uri, {}, fileLabel)
          },
        },
        terminal: {
          tooltip: `Open File at ${label} (Terminal)`,
          onSelected: async () => {
            const commit = await Commit(reference, repository.directory)

            runCommandInTerminal({
              name: fileLabel,
              icon: "file",
              cwd: repository.directory,
              command: userGitCommand({
                key: "openFileAtRevision",
                variables: { revision: reference, filename },
              }),
              context: { commit, filename },
            })
          },
        },
      },
    })
  })
}
