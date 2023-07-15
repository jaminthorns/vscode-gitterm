import * as vscode from "vscode";
import { basename } from "path";

interface CustomTerminalLink<Context> extends vscode.TerminalLink {
  context: Context;
}

interface CustomTerminalOptions<Context> extends vscode.TerminalOptions {
  context: Context;
}

interface FileContext {
  path: string;
}

interface FileRangeContext extends FileContext {
  startLine: number;
  endLine: number;
}

interface CommitContext {
  commit: string;
  path: string | null;
}

const USE_ACTIVE_TERMINAL = false;
const OPEN_TERMINAL_MESSAGE =
  "You must have a terminal open to use this command.";

function isCustomTerminalOptions(
  options: vscode.TerminalOptions
): options is CustomTerminalOptions<any> {
  return "context" in options;
}

function getTerminal<Context>(name: string, icon: string, context: Context) {
  const activeTerminal = vscode.window.activeTerminal;

  if (USE_ACTIVE_TERMINAL && activeTerminal === undefined) {
    vscode.window.showInformationMessage(OPEN_TERMINAL_MESSAGE);
    return null;
  } else if (USE_ACTIVE_TERMINAL && activeTerminal !== undefined) {
    return activeTerminal;
  } else {
    const iconPath = new vscode.ThemeIcon(icon);
    const options: CustomTerminalOptions<Context> = { name, iconPath, context };

    return vscode.window.createTerminal(options);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const fileHistory = vscode.commands.registerTextEditorCommand(
    "git-terminal-history.fileHistory",
    ({ document }: vscode.TextEditor) => {
      const path = vscode.workspace.asRelativePath(document.uri);

      const file = basename(path);
      const title = `File History: ${file}`;
      const terminal = getTerminal(title, "history", { path });

      if (terminal === null) {
        return;
      }

      const commandText = `git history -f ${path}`;

      terminal.show();
      terminal.sendText(commandText);
    }
  );

  const lineHistory = vscode.commands.registerTextEditorCommand(
    "git-terminal-history.lineHistory",
    ({ selection, document }: vscode.TextEditor) => {
      const path = vscode.workspace.asRelativePath(document.uri);
      const context: FileRangeContext = {
        path,
        startLine: selection.start.line + 1,
        endLine: selection.end.line + 1,
      };

      const file = basename(path);
      const lineRange = `${context.startLine},${context.endLine}`;
      const title = `Line History: ${file}:${lineRange}`;
      const terminal = getTerminal(title, "history", context);

      if (terminal === null) {
        return;
      }

      const commandText = `git log -L ${lineRange}:${path}`;

      terminal.show();
      terminal.sendText(commandText);
    }
  );

  const commitLinkProvider = vscode.window.registerTerminalLinkProvider({
    provideTerminalLinks({
      line,
      terminal,
    }): CustomTerminalLink<CommitContext>[] {
      const options = terminal.creationOptions;
      const path = isCustomTerminalOptions(options)
        ? options.context.path ?? null
        : null;

      // TODO: Verify commits are real to avoid false positives using `git
      // rev-parse --verify`.
      const commitMatches = Array.from(line.matchAll(/([0-9a-f]{7,40})/g));

      return commitMatches.map(([match, commit]) => {
        const matchStart = line.indexOf(match);
        const startIndex = matchStart + match.indexOf(commit);

        return {
          startIndex,
          length: commit.length,
          tooltip: "Open commit in a new terminal",
          context: { commit, path },
        };
      });
    },

    handleTerminalLink({ context }: CustomTerminalLink<CommitContext>) {
      const { commit, path } = context;

      // TODO: Show quick pick options:
      // - Show full commit diff
      // - Show commit diff for file (when file is available through context)
      // - Show file at commit (when file is available through context)
      const object = path === null ? commit : `${commit}:${path}`;
      const title = `Commit: ${object}`;
      const terminal = getTerminal(title, "git-commit", context);

      if (terminal === null) {
        return;
      }

      const commandText = `git show ${object}`;

      terminal.show();
      terminal.sendText(commandText);
    },
  });

  context.subscriptions.push(fileHistory, lineHistory, commitLinkProvider);
}

export function deactivate() {}
