import * as vscode from "vscode"
import { SelectableQuickPickButton, SelectableQuickPickItem } from "./quickPick"
import { RemoteProvider } from "./remoteProviders"
import { openUrl } from "./util"

export function remoteItems(
  remotes: RemoteProvider[],
  getRemoteUrl: (provider: RemoteProvider) => vscode.Uri | null,
): SelectableQuickPickItem[] {
  const openRemoteUrl = (provider: RemoteProvider) => {
    const url = getRemoteUrl(provider)

    if (url !== null) {
      openUrl(url)
    }
  }

  const copyUrlButton = (
    provider: RemoteProvider,
  ): SelectableQuickPickButton => ({
    tooltip: "Copy Remote URL",
    iconPath: new vscode.ThemeIcon("copy"),
    onSelected: () => {
      const url = getRemoteUrl(provider)

      if (url !== null) {
        vscode.env.clipboard.writeText(url.toString())
        vscode.window.showInformationMessage("Remote URL copied to clipboard.")
      }
    },
  })

  return remotes.map((provider) => ({
    label: `$(cloud) ${provider.label}`,
    onSelected: () => openRemoteUrl(provider),
    buttons: [copyUrlButton(provider)],
  }))
}
