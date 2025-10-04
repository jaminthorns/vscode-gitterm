import * as vscode from "vscode"
import { Commit, CommitInfo } from "../Commit"
import { SelectableQuickPickItem, showSelectableQuickPick } from "../quickPick"
import { Repository } from "../Repository"
import {
  excludeNulls,
  git,
  reverseHistoryArgs,
  runCommandInTerminal,
  truncate,
  userGitCommand,
} from "../util"
import { commitRemotes, openDiffInEditor, showItem } from "./common"
import { fileAtCommitItems } from "./fileAtCommitItems"
import { remoteAction } from "./remoteAction"

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
          tooltip: "Show Commit (Editor)",
          onSelected: async () => {
            const { directory } = repository
            const prevCommit = await previousCommit(commit.full, directory)

            await openDiffInEditor(prevCommit, commit, commitLabel, repository)
          },
        },
        terminal: {
          tooltip: "Show Commit (Terminal)",
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
      label: "$(copy) Copy Commit ID",
      onSelected: () => {
        vscode.env.clipboard.writeText(commit.full)
      },
    },
    {
      label: "$(copy) Copy Commit Message",
      onSelected: () => {
        vscode.env.clipboard.writeText(commitInfo.message)
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
          tooltip: "History from Commit (Reverse)",
          iconPath: new vscode.ThemeIcon("history"),
          onSelected: () => {
            runCommandInTerminal({
              name: `${commitLabel} (Reverse)`,
              icon: "history",
              cwd: repository.directory,
              command: userGitCommand({
                key: "revisionHistory",
                variables: reverseHistoryArgs(commit.full),
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
        return remoteAction(
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

async function previousCommit(
  revision: string,
  directory: vscode.Uri,
): Promise<Commit> {
  const previousCommit = await Commit(`${revision}^`, directory)

  if (previousCommit !== null) {
    return previousCommit
  }

  const emptyTree = await git("hash-object", ["-t", "tree", "/dev/null"], {
    directory,
  })

  return (await Commit(emptyTree, directory)) as Commit
}
