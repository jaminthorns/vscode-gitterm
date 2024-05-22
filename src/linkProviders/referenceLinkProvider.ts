import { join } from "path"
import * as vscode from "vscode"
import {
  ReferenceContext,
  RepositoryContext,
  TerminalContext,
} from "../context"
import { SelectableQuickPickItem, showSelectableQuickPick } from "../quickPick"
import { ReferenceType, referenceInfo, referenceValid } from "../Reference"
import { RemoteProvider } from "../RemoteProvider"
import { Repository } from "../Repository"
import { RepositoryStore, TerminalFolderStore } from "../stores"
import {
  excludeNulls,
  git,
  runCommandInTerminal,
  userGitCommand,
} from "../util"
import { TerminalOptions } from "./common"
import { pickRemote } from "./pickRemote"

interface ReferenceTerminalLink extends vscode.TerminalLink {
  context: RepositoryContext & ReferenceContext & Partial<TerminalContext>
}

export function referenceLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
) {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<ReferenceTerminalLink[]> {
      const provideReferenceLinks = vscode.workspace
        .getConfiguration("gitterm.terminalLinks")
        .get("provideReferenceLinks") as "always" | "never"

      if (provideReferenceLinks === "never") {
        return []
      }

      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const { context } = terminal.creationOptions as TerminalOptions

      return repository.references
        .findMatches(line)
        .map(({ startIndex, text: reference, value: types }) => ({
          startIndex,
          length: reference.length,
          tooltip: "Pick a reference action",
          context: { ...context, repository, reference, types },
        }))
    },

    async handleTerminalLink({ context }: ReferenceTerminalLink) {
      const { repository, reference, types } = context

      let type: ReferenceType | undefined

      if (types.size > 1) {
        const items = Array.from(types).map((type) => {
          const { icon, label } = referenceInfo[type].disambiguate
          return { type, label: `$(${icon}) ${label}` }
        })

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Ambiguous reference name, select a type",
        })

        type = selected?.type
      } else {
        type = Array.from(types)[0]
      }

      if (type === undefined) {
        return
      }

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
              name: reference,
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
        placeholder: "Select an action",
        items,
      })
    },
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
    case "remote": {
      return remoteBranchInfo(reference, remoteProviders)
    }

    case "branch": {
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

      if (await referenceValid(remoteBranch, "remote", repository.directory)) {
        return remoteBranchInfo(remoteBranch, remoteProviders)
      } else {
        return null
      }
    }

    case "tag": {
      const providers = excludeNulls(
        await Promise.all(
          remoteProviders.map(async (provider) => {
            const pattern = join("refs", refDirectory, reference)
            const output = await git(
              "ls-remote",
              [provider.remote.name, pattern],
              { directory: repository.directory },
            )

            return output === "" ? null : provider
          }),
        ),
      )

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
