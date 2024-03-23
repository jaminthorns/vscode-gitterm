import * as vscode from "vscode"

export type SelectableQuickPickButton = vscode.QuickInputButton & {
  onSelected?: () => void
}

export type ConcreteQuickPickItem = vscode.QuickPickItem & {
  onSelected?: () => void
}

export interface PendingQuickPickItem {
  placeholder: ConcreteQuickPickItem
  pending: Promise<ConcreteQuickPickItem | null>
}

export type SelectableQuickPickItem =
  | ConcreteQuickPickItem
  | PendingQuickPickItem

function isPending(
  item: ConcreteQuickPickItem | PendingQuickPickItem,
): item is PendingQuickPickItem {
  return "placeholder" in item
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
      const { placeholder, pending } = item

      pending.then((item) => {
        const activeItems = quickPick.activeItems
        const newItems = Array.from(quickPick.items)

        if (item === null) {
          delete newItems[index]
        } else {
          newItems[index] = item
        }

        quickPick.items = newItems

        // Restore active items if possible.
        if (activeItems.length > 0) {
          if (activeItems[0] === placeholder) {
            if (item !== null) {
              quickPick.activeItems = [item]
            }
          } else {
            quickPick.activeItems = activeItems
          }
        }
      })

      return placeholder
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
