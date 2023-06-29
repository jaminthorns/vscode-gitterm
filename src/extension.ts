import * as vscode from "vscode";
import { basename } from "path";

const USE_ACTIVE_TERMINAL = false;
const OPEN_TERMINAL_MESSAGE =
  "You must have a terminal open to use this command.";

function getTerminal(name: string) {
  const activeTerminal = vscode.window.activeTerminal;

  if (USE_ACTIVE_TERMINAL && activeTerminal === undefined) {
    vscode.window.showInformationMessage(OPEN_TERMINAL_MESSAGE);
    return null;
  } else if (USE_ACTIVE_TERMINAL && activeTerminal !== undefined) {
    return activeTerminal;
  } else {
    const historyIcon = new vscode.ThemeIcon("history");
    return vscode.window.createTerminal({ name, iconPath: historyIcon });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const fileHistory = vscode.commands.registerTextEditorCommand(
    "git-terminal-history.fileHistory",
    (editor: vscode.TextEditor) => {
      const path = vscode.workspace.asRelativePath(editor.document.uri);
      const commandText = `git history -f ${path}`;

      const fileName = basename(path);
      const terminal = getTerminal(`File History: ${fileName}`);

      if (terminal === null) {
        return;
      }

      terminal.show();
      terminal.sendText(commandText);
    }
  );

  const lineHistory = vscode.commands.registerTextEditorCommand(
    "git-terminal-history.lineHistory",
    (editor: vscode.TextEditor) => {
      const { start, end } = editor.selection;
      const lineRange = `${start.line + 1},${end.line + 1}`;
      const path = vscode.workspace.asRelativePath(editor.document.uri);
      const commandText = `git log -L ${lineRange}:${path}`;

      const fileName = basename(path);
      const terminal = getTerminal(`Line History: ${fileName}:${lineRange}`);

      if (terminal === null) {
        return;
      }

      terminal.show();
      terminal.sendText(commandText);
    }
  );

  context.subscriptions.push(fileHistory, lineHistory);
}

export function deactivate() {}
