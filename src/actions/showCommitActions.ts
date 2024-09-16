import * as vscode from "vscode"
import { Commit, CommitInfo } from "../Commit"
import { SelectableQuickPickItem, showSelectableQuickPick } from "../quickPick"
import { Repository } from "../Repository"
import { reverseHistory } from "../UserGitCommand"
import {
  excludeNulls,
  git,
  runCommandInTerminal,
  truncate,
  userGitCommand,
} from "../util"
import { commitRemotes, gitUri, showItem } from "./common"
import { fileAtCommitItems } from "./fileAtCommitItems"
import { pickRemote } from "./pickRemote"

export async function showCommitActions(
  repository: Repository,
  commit: Commit,
  filename?: string,
) {
  const remotes = commitRemotes(commit, repository)
  const commitInfo = await CommitInfo(commit.full, repository.directory)

  const { authorDate, authorName, subject } = commitInfo
  const commitLabel = `${commit.short} - ${truncate(subject, 36)}`

  const commitItems: SelectableQuickPickItem[] = excludeNulls([
    {
      label: commit.short,
      kind: vscode.QuickPickItemKind.Separator,
    },
    showItem({
      item: {
        label: subject,
        detail: `$(account) ${authorName}, $(history) ${authorDate.toLocaleString()}`,
      },
      configKey: "revision",
      showOptions: {
        editor: {
          tooltip: "Show Commit in Editor",
          onSelected: async () => {
            await openRevisionInEditor(commit, repository)
          },
        },
        terminal: {
          tooltip: "Show Commit in Terminal",
          onSelected: () => {
            runCommandInTerminal({
              name: commitLabel,
              icon: "git-commit",
              cwd: repository.directory,
              command: userGitCommand({
                key: "showRevision",
                variables: { revision: commit.full },
              }),
              context: { commit },
            })
          },
        },
      },
    }),
    {
      label: "$(clippy) Copy Commit ID",
      onSelected: () => {
        vscode.env.clipboard.writeText(commit.full)
      },
    },
    {
      label: "$(history) History from Commit",
      onSelected: () => {
        runCommandInTerminal({
          name: commitLabel,
          icon: "history",
          cwd: repository.directory,
          command: userGitCommand({
            key: "revisionHistory",
            variables: { revision: commit.full },
          }),
          context: { commit },
        })
      },
      buttons: [
        {
          tooltip: "History (Reverse) from Commit",
          iconPath: new vscode.ThemeIcon("history"),
          onSelected: () => {
            runCommandInTerminal({
              name: `${commitLabel} (Reverse)`,
              icon: "history",
              cwd: repository.directory,
              command: userGitCommand({
                key: "revisionHistory",
                variables: reverseHistory({ revision: commit.full }),
              }),
              context: { commit },
            })
          },
        },
      ],
    },
    {
      placeholder: { label: "$(loading~spin) Loading remotes..." },
      pending: remotes.then((remotes) => {
        return pickRemote(
          remotes,
          { label: "$(link-external) Open Commit on Remote" },
          (provider) => provider.commitUrl(commit),
        )
      }),
    },
  ])

  let fileCommitItems: SelectableQuickPickItem[] = []

  if (filename !== undefined) {
    fileCommitItems = fileAtCommitItems(repository, remotes, commit, filename)
  }

  showSelectableQuickPick({
    placeholder: "Select a commit action",
    items: [...commitItems, ...fileCommitItems],
  })
}

async function openRevisionInEditor(commit: Commit, repository: Repository) {
  const { directory } = repository

  const showCommand = git(
    "show",
    ["--name-status", "--format=", "--diff-filter=ADMR", commit.full],
    { directory },
  )

  const [prevCommit, commitInfo, showOutput] = await Promise.all([
    Commit(`${commit.full}^`, directory),
    CommitInfo(commit.full, directory),
    showCommand,
  ])

  const lines = showOutput.split("\n").map((line) => line.split("\t"))

  const resources = lines.map(([status, ...filenames]) => {
    switch (status[0]) {
      case "A":
        return {
          originalUri: undefined,
          modifiedUri: gitUri(filenames[0], commit, directory),
        }

      case "M":
        return {
          originalUri: gitUri(filenames[0], prevCommit, directory),
          modifiedUri: gitUri(filenames[0], commit, directory),
        }

      case "D":
        return {
          originalUri: gitUri(filenames[0], prevCommit, directory),
          modifiedUri: undefined,
        }

      case "R":
        return {
          originalUri: gitUri(filenames[0], prevCommit, directory),
          modifiedUri: gitUri(filenames[1], commit, directory),
        }
    }
  })

  const multiDiffSourceUri = vscode.Uri.from({
    scheme: "git-commit",
    path: directory.path,
    query: JSON.stringify({
      path: directory.fsPath,
      ref: commit.full,
    }),
  })

  vscode.commands.executeCommand("_workbench.openMultiDiffEditor", {
    multiDiffSourceUri,
    title: `${commit.short} - ${commitInfo.subject}`,
    resources,
  })
}
