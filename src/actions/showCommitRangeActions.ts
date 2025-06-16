import * as vscode from "vscode"
import { Commit } from "../Commit"
import { showSelectableQuickPick } from "../quickPick"
import { Repository } from "../Repository"
import { git, runCommandInTerminal, userGitCommand } from "../util"
import { openDiffInEditor, showItem } from "./common"

export function showCommitRangeActions(
  repository: Repository,
  fromCommit: Commit,
  toCommit: Commit,
) {
  const rangeLabel = `${fromCommit.short}..${toCommit.short}`
  const rangeDiffLabel = `${fromCommit.short} ↔ ${toCommit.short}`

  showSelectableQuickPick({
    placeholder: "Select a commit range action",
    items: [
      {
        label: rangeLabel,
        kind: vscode.QuickPickItemKind.Separator,
      },
      {
        label: "$(history) Commit Range History",
        onSelected: () => {
          runCommandInTerminal({
            name: rangeLabel,
            icon: "history",
            cwd: repository.directory,
            command: userGitCommand({
              key: "revisionRangeHistory",
              variables: {
                revisionRange: `${fromCommit.full}..${toCommit.full}`,
              },
            }),
          })
        },
      },
      showItem({
        item: { label: "$(git-compare) Commit Range Diff" },
        configKey: "revisionRangeDiff",
        showOptions: {
          editor: {
            tooltip: "Commit Range Diff (Editor)",
            onSelected: async () => {
              const { directory } = repository

              const flags = ["--name-status", "--diff-filter=ADMR"]
              const commits = [fromCommit.full, toCommit.full]
              const args = [...flags, ...commits]
              const fileStatuses = await git("diff", args, { directory })

              openDiffInEditor(
                fromCommit,
                toCommit,
                rangeDiffLabel,
                fileStatuses,
                repository,
              )
            },
          },
          terminal: {
            tooltip: "Commit Range Diff (Terminal)",
            onSelected: () => {
              runCommandInTerminal({
                name: rangeDiffLabel,
                icon: "git-compare",
                cwd: repository.directory,
                command: userGitCommand({
                  key: "revisionDiff",
                  variables: {
                    fromRevision: fromCommit.full,
                    toRevision: toCommit.full,
                  },
                }),
              })
            },
          },
        },
      }),
    ],
  })
}
