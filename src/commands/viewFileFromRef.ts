import * as vscode from "vscode"
import { relativeGitUri } from "../actions/common"
import { Commit } from "../Commit"
import { showSelectableQuickPick } from "../quickPick"
import { ReferenceType } from "../references"
import { Repository } from "../Repository"
import { RepositoryStore } from "../stores"
import { git } from "../util"
import { validateFileTracked } from "./validateFile"

interface ReferenceItem {
  label: string
  description?: string
  reference: string
  type: ReferenceType
}

export async function viewFileFromRef(
  uri: vscode.Uri,
  repositories: RepositoryStore,
) {
  const repository = repositories.getRepository(uri)

  if (repository === undefined) {
    vscode.window.showErrorMessage("This file is not in a Git repository.")
    return
  }

  // Check if file is tracked by Git
  if (!(await validateFileTracked(uri, repository))) {
    return
  }

  const filename = vscode.workspace.asRelativePath(uri, false)

  const references = await collectReferences(repository)

  if (references.length === 0) {
    vscode.window.showErrorMessage(
      "No references (branches/tags) found in this repository.",
    )
    return
  }

  showSelectableQuickPick({
    placeholder: "Select a reference to view the file at",
    items: references.map((ref) => ({
      label: `$(${getIconForType(ref.type)}) ${ref.label}`,
      description: ref.description,
      onSelected: async () => {
        await openFileAtReference(filename, ref.reference, repository)
      },
    })),
  })
}

async function collectReferences(
  repository: Repository,
): Promise<ReferenceItem[]> {
  const references: ReferenceItem[] = []

  // Get local branches
  const localBranches = repository.localBranches.entries()
  for (const [branch] of localBranches) {
    const isCurrentBranch = await isCurrentHead(branch, repository)
    references.push({
      label: branch,
      description: isCurrentBranch ? "current branch" : undefined,
      reference: branch,
      type: "localBranch",
    })
  }

  // Get remote branches
  const remoteBranches = repository.remoteBranches.entries()
  for (const [branch] of remoteBranches) {
    references.push({
      label: branch,
      reference: branch,
      type: "remoteBranch",
    })
  }

  // Get tags
  const tags = repository.tags.entries()
  for (const [tag] of tags) {
    references.push({
      label: tag,
      reference: tag,
      type: "tag",
    })
  }

  return references.sort((a, b) => {
    // Sort current branch first, then by type, then alphabetically
    if (a.description === "current branch") {
      return -1
    }
    if (b.description === "current branch") {
      return 1
    }

    const typeOrder = { localBranch: 0, remoteBranch: 1, tag: 2 }
    const typeComparison = typeOrder[a.type] - typeOrder[b.type]
    if (typeComparison !== 0) {
      return typeComparison
    }

    return a.label.localeCompare(b.label)
  })
}

async function isCurrentHead(
  branch: string,
  repository: Repository,
): Promise<boolean> {
  try {
    const currentBranch = await git("branch", ["--show-current"], {
      directory: repository.directory,
    })
    return currentBranch.trim() === branch
  } catch {
    return false
  }
}

async function openFileAtReference(
  filename: string,
  reference: string,
  repository: Repository,
): Promise<void> {
  try {
    // Check if file exists at the reference
    await git("cat-file", ["-e", `${reference}:${filename}`], {
      directory: repository.directory,
    })

    // Get commit object for the reference
    const commitSha = await git("rev-parse", [reference], {
      directory: repository.directory,
    })

    const commit = await Commit(commitSha.trim(), repository.directory)

    if (commit === null) {
      vscode.window.showErrorMessage(
        `Could not resolve reference: ${reference}`,
      )
      return
    }

    const uri = relativeGitUri(filename, commit, repository.directory)
    const title = `${filename} (${reference})`

    await vscode.commands.executeCommand("vscode.open", uri, {}, title)
  } catch {
    vscode.window.showErrorMessage(
      `File does not exist at reference: ${reference}`,
    )
  }
}

function getIconForType(type: ReferenceType): string {
  switch (type) {
    case "localBranch":
      return "git-branch"
    case "remoteBranch":
      return "cloud"
    case "tag":
      return "tag"
  }
}
