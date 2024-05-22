import * as vscode from "vscode"
import { Commit, CommitInfo } from "../Commit"
import { CommitContext, RepositoryContext, TerminalContext } from "../context"
import { SelectableQuickPickItem, showSelectableQuickPick } from "../quickPick"
import Repository from "../Repository"
import RepositoryStore from "../RepositoryStore"
import TerminalFolderStore from "../TerminalFolderStore"
import {
  excludeNulls,
  git,
  runCommandInTerminal,
  truncate,
  userGitCommand,
} from "../util"
import { TerminalOptions, commitRemotes, gitUri } from "./common"
import { fileAtCommitItems } from "./fileAtCommitItems"
import { pickRemote } from "./pickRemote"

interface CommitTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & CommitContext & Partial<TerminalContext>
}

export function commitLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
) {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<CommitTerminalLink[]> {
      const provideCommitLinks = vscode.workspace
        .getConfiguration("gitterm.terminalLinks")
        .get("provideCommitLinks") as "always" | "never"

      if (provideCommitLinks === "never") {
        return []
      }

      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const { context } = terminal.creationOptions as TerminalOptions
      const lineMatches = Array.from(line.matchAll(/([0-9a-f]{7,40})/g))

      return excludeNulls(
        await Promise.all(
          lineMatches.map(async (match) => {
            const rawCommit = match[0]
            const commit = await Commit(rawCommit, repository.directory)

            if (commit === null) {
              return null
            } else {
              return {
                startIndex: match.index,
                length: rawCommit.length,
                tooltip: "Pick a commit action",
                context: { ...context, repository, commit },
              }
            }
          }),
        ),
      )
    },

    async handleTerminalLink({ context }: CommitTerminalLink) {
      const { repository, commit } = context

      const remotes = commitRemotes(commit, repository)
      const [commitFilenames, commitInfo] = await Promise.all([
        "commitFilenames" in context ? context.commitFilenames : undefined,
        CommitInfo(commit.full, repository.directory),
      ])

      const { authorDate, authorName, subject } = commitInfo
      const commitLabel = `${commit.abbreviated} - ${truncate(subject, 36)}`
      const commitFilename = commitFilenames?.get(commit.full) ?? null

      const commitItems: SelectableQuickPickItem[] = excludeNulls([
        {
          label: commit.abbreviated,
          kind: vscode.QuickPickItemKind.Separator,
        },
        {
          label: subject,
          detail: `${authorName} • ${authorDate.toLocaleString()}`,
          onSelected: async () => {
            const showRevision = vscode.workspace
              .getConfiguration("gitterm.show")
              .get("revision") as "editor" | "terminal"

            if (showRevision === "editor") {
              await openRevisionInEditor(commit, repository)
            } else if (showRevision === "terminal") {
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
            }
          },
        },
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
            })
          },
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

      if (commitFilename !== null) {
        fileCommitItems = fileAtCommitItems(
          repository,
          remotes,
          commit,
          commitFilename,
        )
      }

      showSelectableQuickPick({
        placeholder: "Select an action",
        items: [...commitItems, ...fileCommitItems],
      })
    },
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
    title: `${commit.abbreviated} - ${commitInfo.subject}`,
    resources,
  })
}
