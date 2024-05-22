import { basename } from "path"
import * as vscode from "vscode"
import { Commit } from "../Commit"
import RemoteProvider from "../RemoteProvider"
import Repository from "../Repository"
import {
  commitFilenames,
  excludeNulls,
  runCommandInTerminal,
  userGitCommand,
} from "../util"
import { gitUri } from "./common"
import { pickRemote } from "./pickRemote"

export function fileAtCommitItems(
  repository: Repository,
  remotes: Promise<RemoteProvider[]>,
  commit: Commit,
  filename: string,
) {
  const fileLabel = `${basename(filename)} (${commit.abbreviated})`
  const variables = { revision: commit.full, filename }

  const getContext = () => ({
    commit,
    filename,
    commitFilenames: commitFilenames(
      commit.full,
      filename,
      repository.directory,
    ),
  })

  return excludeNulls([
    {
      label: fileLabel,
      kind: vscode.QuickPickItemKind.Separator,
    },
    {
      label: "$(file) Show File",
      onSelected: () => {
        const showFileAtRevision = vscode.workspace
          .getConfiguration("gitterm.show")
          .get("fileAtRevision") as "editor" | "terminal"

        if (showFileAtRevision === "editor") {
          const uri = gitUri(filename, commit, repository.directory)

          vscode.window.showTextDocument(uri)
        } else if (showFileAtRevision === "terminal") {
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
        }
      },
    },
    {
      label: "$(git-compare) Show Diff",
      onSelected: async () => {
        const showFileDiffAtRevision = vscode.workspace
          .getConfiguration("gitterm.show")
          .get("fileDiffAtRevision") as "editor" | "terminal"

        if (showFileDiffAtRevision === "editor") {
          await showFileAtCommitInEditor(filename, commit, repository)
        } else if (showFileDiffAtRevision === "terminal") {
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
        }
      },
    },
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
    title = `${basename(filename)} (added in ${commit.abbreviated})`
  } else {
    const left = `${basename(prevFilename)} (${prevCommit.abbreviated})`
    const right = `${basename(filename)} (${commit.abbreviated})`

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
  const result = await commitFilenames(commit.full, filename, directory, 2)

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
