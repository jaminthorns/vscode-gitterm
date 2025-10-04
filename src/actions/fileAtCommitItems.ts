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
import { relativeGitUri, showItem } from "./common"
import { remoteAction } from "./remoteAction"

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
      item: { label: "$(file) Open File at Commit" },
      configKey: "fileAtRevision",
      showOptions: {
        editor: {
          tooltip: "Open File at Commit (Editor)",
          onSelected: () => {
            const uri = relativeGitUri(filename, commit, repository.directory)

            vscode.commands.executeCommand("vscode.open", uri, {}, fileLabel)
          },
        },
        terminal: {
          tooltip: "Open File at Commit (Terminal)",
          onSelected: () => {
            runCommandInTerminal({
              name: fileLabel,
              icon: "file",
              cwd: repository.directory,
              command: userGitCommand({
                key: "openFileAtRevision",
                variables,
              }),
              context: getContext(),
            })
          },
        },
      },
    }),
    showItem({
      item: { label: "$(git-compare) File Diff at Commit" },
      configKey: "fileDiffAtRevision",
      showOptions: {
        editor: {
          tooltip: "File Diff at Commit (Editor)",
          onSelected: async () => {
            await openFileDiffInEditor(filename, commit, repository)
          },
        },
        terminal: {
          tooltip: "File Diff at Commit (Terminal)",
          onSelected: () => {
            runCommandInTerminal({
              name: fileLabel,
              icon: "git-compare",
              cwd: repository.directory,
              command: userGitCommand({
                key: "fileDiffAtRevision",
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
        return remoteAction(
          remotes,
          { label: "$(link-external) Open File on Remote" },
          (provider) => provider.fileAtCommitUrl(commit, filename),
        )
      }),
    },
  ])
}

async function openFileDiffInEditor(
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
    relativeGitUri(prevFilename, prevCommit, repository.directory),
    relativeGitUri(filename, commit, repository.directory),
    title,
  )
}

// TODO: This gets the previous commit in the context of the file, instead of
// just getting the commit's parent. It should just be changed to get the parent
// commit instead.
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
