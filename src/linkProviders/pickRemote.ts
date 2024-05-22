import * as vscode from "vscode"
import {
  ConcreteQuickPickItem,
  SelectableQuickPickButton,
  showSelectableQuickPick,
} from "../quickPick"
import RemoteProvider from "../RemoteProvider"

export function pickRemote(
  remotes: RemoteProvider[],
  item: vscode.QuickPickItem,
  getRemoteUrl: (provider: RemoteProvider) => vscode.Uri | null,
): ConcreteQuickPickItem | null {
  const openRemoteUrl = (provider: RemoteProvider) => {
    const url = getRemoteUrl(provider)

    if (url !== null) {
      vscode.env.openExternal(url)
    }
  }

  const copyUrlButton = (
    provider: RemoteProvider,
  ): SelectableQuickPickButton => ({
    tooltip: "Copy Remote URL",
    iconPath: new vscode.ThemeIcon("clippy"),
    onSelected: () => {
      const url = getRemoteUrl(provider)

      if (url !== null) {
        vscode.env.clipboard.writeText(url.toString())
        vscode.window.showInformationMessage("Remote URL copied to clipboard.")
      }
    },
  })

  if (remotes.length === 0) {
    return null
  } else if (remotes.length === 1) {
    return {
      ...item,
      onSelected: () => openRemoteUrl(remotes[0]),
      buttons: [copyUrlButton(remotes[0])],
    }
  } else {
    return {
      ...item,
      label: `${item.label}...`,
      onSelected: () => {
        showSelectableQuickPick({
          placeholder: "Select a remote",
          items: remotes.map((provider) => ({
            label: `$(globe) ${provider.label}`,
            onSelected: () => openRemoteUrl(provider),
            buttons: [copyUrlButton(provider)],
          })),
        })
      },
    }
  }
}
