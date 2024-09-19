import { basename } from "path"
import * as vscode from "vscode"
import { Commit } from "../Commit"
import { SelectableQuickPickItem } from "../quickPick"
import { RemoteProvider } from "../remoteProviders"
import { Repository } from "../Repository"
import {
  CommitFilenamesOptions,
  commitFilenames,
  excludeNulls,
  reverseHistoryArgs,
  runCommandInTerminal,
  userGitCommand,
} from "../util"
import { gitUri, showItem } from "./common"
import { pickRemote } from "./pickRemote"

export function fileAtCommitItems(
  repository: Repository,
  remotes: Promise<RemoteProvider[]>,
  commit: Commit,
  filename: string,
): SelectableQuickPickItem[] {
  const fileLabel = `${basename(filename)} (${commit.short})`
  const variables = { revision: commit.full, filename }

  const getContext = (commitFilenamesOptions: CommitFilenamesOptions = {}) => ({
    commit,
    filename,
    commitFilenames: commitFilenames(
      commit.full,
      filename,
      repository.directory,
      commitFilenamesOptions,
    ),
  })

  return excludeNulls([
    {
      label: fileLabel,
      kind: vscode.QuickPickItemKind.Separator,
    },
    showItem({
      item: { label: "$(file) Show File" },
      configKey: "fileAtRevision",
      showOptions: {
        editor: {
          tooltip: "Show File in Editor",
          onSelected: () => {
            const uri = gitUri(filename, commit, repository.directory)

            vscode.window.showTextDocument(uri)
          },
        },
        terminal: {
          tooltip: "Show File in Terminal",
          onSelected: () => {
            runCommandInTerminal({
              name: fileLabel,
              icon: "file",
              cwd: repository.directory,
              command: userGitCommand({
                key: "showFileAtRevision",
                variables,
              }),
              context: getContext(),
            })
          },
        },
      },
    }),
    showItem({
      item: { label: "$(git-compare) Show Diff" },
      configKey: "fileDiffAtRevision",
      showOptions: {
        editor: {
          tooltip: "Show Diff in Editor",
          onSelected: async () => {
            await showFileAtCommitInEditor(filename, commit, repository)
          },
        },
        terminal: {
          tooltip: "Show Diff in Terminal",
          onSelected: () => {
            runCommandInTerminal({
              name: fileLabel,
              icon: "git-compare",
              cwd: repository.directory,
              command: userGitCommand({
                key: "showFileDiffAtRevision",
                variables,
              }),
              context: getContext(),
            })
          },
        },
      },
    }),
    {
      label: "$(history) File History from Commit",
      onSelected: () => {
        runCommandInTerminal({
          name: fileLabel,
          icon: "history",
          cwd: repository.directory,
          command: userGitCommand({
            key: "fileHistory",
            variables,
          }),
          context: getContext(),
        })
      },
      buttons: [
        {
          tooltip: "File History from Commit (Reverse)",
          iconPath: new vscode.ThemeIcon("history"),
          onSelected: () => {
            runCommandInTerminal({
              name: `${fileLabel} (Reverse)`,
              icon: "history",
              cwd: repository.directory,
              command: userGitCommand({
                key: "fileHistory",
                variables: { ...reverseHistoryArgs(commit.full), filename },
              }),
              context: getContext({ reverse: true }),
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
          { label: "$(link-external) Open File on Remote" },
          (provider) => provider.fileAtCommitUrl(commit, filename),
        )
      }),
    },
  ])
}

async function showFileAtCommitInEditor(
  filename: string,
  commit: Commit,
  repository: Repository,
) {
  const previous = await previousInfo(commit, filename, repository.directory)
  const prevCommit = previous?.commit ?? null
  const prevFilename = previous?.filename ?? filename

  let title

  if (prevCommit === null) {
    title = `${basename(filename)} (added in ${commit.short})`
  } else {
    const left = `${basename(prevFilename)} (${prevCommit.short})`
    const right = `${basename(filename)} (${commit.short})`

    title = `${left} ↔ ${right}`
  }

  vscode.commands.executeCommand(
    "vscode.diff",
    gitUri(prevFilename, prevCommit, repository.directory),
    gitUri(filename, commit, repository.directory),
    title,
  )
}

async function previousInfo(
  commit: Commit,
  filename: string,
  directory: vscode.Uri,
): Promise<{ commit: Commit; filename: string } | null> {
  const result = await commitFilenames(commit.full, filename, directory, {
    maxCount: 2,
  })

  if (result === null) {
    return null
  }

  const entries = Array.from(result)

  if (entries.length !== 2) {
    return null
  }

  const [prevCommitRaw, prevFilename] = entries[1]
  const prevCommit = await Commit(prevCommitRaw, directory)

  if (prevCommit === null) {
    return null
  } else {
    return { commit: prevCommit, filename: prevFilename }
  }
}
