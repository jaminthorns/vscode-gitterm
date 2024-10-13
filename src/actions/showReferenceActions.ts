import { join } from "path"
import * as vscode from "vscode"
import { SelectableQuickPickItem, showSelectableQuickPick } from "../quickPick"
import { ReferenceType, referenceInfo, referenceValid } from "../references"
import { RemoteProvider } from "../remoteProviders"
import { Repository } from "../Repository"
import { filterAsync, git, runCommandInTerminal, userGitCommand } from "../util"
import { pickRemote } from "./pickRemote"

export function showReferenceActions(
  repository: Repository,
  type: ReferenceType,
  reference: string,
) {
  const getOpenOnRemoteItem = async (type: ReferenceType) => {
    const { directory, remoteLabel } = referenceInfo[type]
    const info = await remoteReferenceInfo(
      type,
      reference,
      directory,
      repository,
    )

    if (info === null) {
      return null
    }

    const { remoteReference, remoteProviders } = info

    return pickRemote(
      remoteProviders,
      { label: `$(link-external) Open ${remoteLabel} on Remote` },
      (provider) => provider.referenceUrl(remoteReference),
    )
  }

  const { label } = referenceInfo[type]

  const items: SelectableQuickPickItem[] = [
    {
      label: reference,
      kind: vscode.QuickPickItemKind.Separator,
    },
    {
      label: `$(history) History from ${label}`,
      onSelected: () => {
        runCommandInTerminal({
          name: `${reference} (${label})`,
          icon: "history",
          cwd: repository.directory,
          command: userGitCommand({
            key: "revisionHistory",
            variables: { revision: reference },
          }),
        })
      },
    },
    {
      label: `$(clippy) Copy ${label} Name`,
      onSelected: () => {
        vscode.env.clipboard.writeText(reference)
      },
    },
    {
      placeholder: { label: "$(loading~spin) Loading remotes..." },
      pending: getOpenOnRemoteItem(type),
    },
  ]

  showSelectableQuickPick({
    placeholder: `Select a ${label.toLowerCase()} action`,
    items,
  })
}

interface RemoteReferenceInfo {
  remoteProviders: RemoteProvider[]
  remoteReference: string
}

async function remoteReferenceInfo(
  type: ReferenceType,
  reference: string,
  refDirectory: string,
  repository: Repository,
): Promise<RemoteReferenceInfo | null> {
  const remoteProviders = repository.remoteProviders.sorted()

  if (remoteProviders.length === 0) {
    return null
  }

  switch (type) {
    case "remoteBranch": {
      return remoteBranchInfo(reference, remoteProviders)
    }

    case "localBranch": {
      const fullReference = await git(
        "rev-parse",
        ["--symbolic-full-name", reference],
        { directory: repository.directory },
      )

      const remoteBranch = await git(
        "for-each-ref",
        ["--format=%(upstream:short)", fullReference],
        { directory: repository.directory },
      )

      if (
        await referenceValid(remoteBranch, "remoteBranch", repository.directory)
      ) {
        return remoteBranchInfo(remoteBranch, remoteProviders)
      } else {
        return null
      }
    }

    case "tag": {
      const providers = await filterAsync(remoteProviders, async (provider) => {
        const pattern = join("refs", refDirectory, reference)
        const output = await git("ls-remote", [provider.remote.name, pattern], {
          directory: repository.directory,
        })

        return output !== ""
      })

      return { remoteReference: reference, remoteProviders: providers }
    }
  }
}

function remoteBranchInfo(
  remoteBranch: string,
  remoteProviders: RemoteProvider[],
): RemoteReferenceInfo | null {
  const provider = remoteProviders.find(({ remote }) =>
    remoteBranch.startsWith(`${remote.name}/`),
  )

  if (provider === undefined) {
    return null
  }

  const remoteReference = remoteBranch.replace(`${provider.remote.name}/`, "")

  return { remoteReference, remoteProviders: [provider] }
}
