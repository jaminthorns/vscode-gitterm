import * as vscode from "vscode"

export type SelectableQuickPickItem = vscode.QuickPickItem & {
  onSelected?: () => void
}

export type SelectableQuickPickButton = vscode.QuickInputButton & {
  onSelected?: () => void
}

export function showSelectableQuickPick({
  placeholder,
  items,
}: {
  placeholder?: string
  items: SelectableQuickPickItem[]
}) {
  const quickPick: vscode.QuickPick<SelectableQuickPickItem> =
    vscode.window.createQuickPick()

  quickPick.placeholder = placeholder
  quickPick.items = items

  quickPick.onDidAccept(() => {
    const selectedItem = quickPick.selectedItems[0]
    selectedItem.onSelected?.()
  })

  quickPick.onDidTriggerItemButton((event) => {
    const button = event.button as SelectableQuickPickButton
    button.onSelected?.()
  })

  quickPick.show()
}
