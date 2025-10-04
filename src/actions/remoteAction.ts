import * as vscode from "vscode"
import { ConcreteQuickPickItem, showSelectableQuickPick } from "../quickPick"
import { remoteItems } from "../remoteItems"
import { RemoteProvider } from "../remoteProviders"

export function remoteAction(
  remotes: RemoteProvider[],
  item: ConcreteQuickPickItem,
  getRemoteUrl: (provider: RemoteProvider) => vscode.Uri | null,
): ConcreteQuickPickItem | null {
  if (remotes.length === 0) {
    return null
  } else if (remotes.length === 1) {
    return {
      ...remoteItems(remotes, getRemoteUrl)[0],
      ...item,
    }
  } else {
    return {
      ...item,
      label: `${item.label}...`,
      onSelected: () => {
        showSelectableQuickPick({
          placeholder: "Select a remote",
          items: remoteItems(remotes, getRemoteUrl),
        })
      },
    }
  }
}
