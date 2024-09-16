import * as vscode from "vscode"

export interface SelectableQuickPickButton extends vscode.QuickInputButton {
  onSelected?: () => void
}

export interface ConcreteQuickPickItem extends vscode.QuickPickItem {
  onSelected?: () => void
  buttons?: SelectableQuickPickButton[]
}

interface PendingQuickPickItem {
  placeholder: ConcreteQuickPickItem
  pending: Promise<ConcreteQuickPickItem | null>
}

export type SelectableQuickPickItem =
  | ConcreteQuickPickItem
  | PendingQuickPickItem

function isPending(
  item: ConcreteQuickPickItem | PendingQuickPickItem,
): item is PendingQuickPickItem {
  return "pending" in item
}

export function showSelectableQuickPick({
  placeholder,
  items,
}: {
  placeholder?: string
  items: SelectableQuickPickItem[]
}) {
  const quickPick: vscode.QuickPick<ConcreteQuickPickItem> =
    vscode.window.createQuickPick()

  quickPick.placeholder = placeholder

  quickPick.items = items.map((item, index) => {
    if (isPending(item)) {
      resolvePendingItem(quickPick, item, index)
      return item.placeholder
    } else {
      return item
    }
  })

  quickPick.onDidAccept(() => {
    const selectedItem = quickPick.selectedItems[0]

    selectedItem.onSelected?.()
    quickPick.hide()
  })

  quickPick.onDidTriggerItemButton((event) => {
    const button = event.button as SelectableQuickPickButton
    button.onSelected?.()
  })

  quickPick.onDidHide(() => {
    quickPick.dispose()
  })

  quickPick.show()
}

async function resolvePendingItem(
  quickPick: vscode.QuickPick<ConcreteQuickPickItem>,
  { placeholder, pending }: PendingQuickPickItem,
  index: number,
) {
  const resolved = await pending

  const activeItems = quickPick.activeItems
  const newItems = Array.from(quickPick.items)

  if (resolved === null) {
    newItems.splice(index, 1)
  } else {
    newItems[index] = resolved
  }

  quickPick.items = newItems

  // Settings items clears activeItems, restore activeItems if possible.
  if (activeItems.length > 0) {
    if (activeItems[0] === placeholder) {
      if (resolved !== null) {
        quickPick.activeItems = [resolved]
      }
    } else {
      quickPick.activeItems = activeItems
    }
  }
}
