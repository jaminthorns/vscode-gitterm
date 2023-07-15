import * as vscode from "vscode";
import { basename } from "path";
import { exec } from "child_process";

interface TerminalOptionsWithContext extends vscode.TerminalOptions {
  context: any;
}

interface CommitTerminalLink extends vscode.TerminalLink {
  context: {
    commit: string;
    path: string | null;
  };
}

function isCustomTerminalOptions(
  options: vscode.TerminalOptions
): options is TerminalOptionsWithContext {
  return "context" in options;
}

async function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const folders = vscode.workspace.workspaceFolders;

    if (folders !== undefined && folders[0]) {
      const folder = folders[0];

      exec(`cd ${folder.uri.fsPath} && ${command}`, (error, stdout, stderr) => {
        if (error === null) {
          resolve(stdout.trim());
        } else {
          reject(stderr.trim());
        }
      });
    } else {
      reject("No folders are opened in this workspace");
    }
  });
}

async function isCommit(text: string): Promise<boolean> {
  try {
    await runCommand(`git rev-parse --verify ${text}`);
    return true;
  } catch (error) {
    return false;
  }
}

async function abbreviateCommit(commit: string): Promise<string> {
  return await runCommand(`git rev-parse --short ${commit}`);
}

function runCommandInTerminal<Context>({
  name,
  icon,
  context,
  command,
}: {
  name: string;
  icon: string;
  context: Context;
  command: string;
}) {
  const iconPath = new vscode.ThemeIcon(icon);
  const options: TerminalOptionsWithContext = { name, iconPath, context };
  const terminal = vscode.window.createTerminal(options);

  terminal.show();
  terminal.sendText(command);
}

export function activate(context: vscode.ExtensionContext) {
  const fileHistory = vscode.commands.registerTextEditorCommand(
    "git-terminal-history.fileHistory",
    ({ document }: vscode.TextEditor) => {
      const path = vscode.workspace.asRelativePath(document.uri);
      const file = basename(path);

      runCommandInTerminal({
        name: `File History: ${file}`,
        icon: "history",
        command: `git history -f ${path}`,
        context: { path },
      });
    }
  );

  const lineHistory = vscode.commands.registerTextEditorCommand(
    "git-terminal-history.lineHistory",
    ({ selection, document }: vscode.TextEditor) => {
      const startLine = selection.start.line + 1;
      const endLine = selection.end.line + 1;
      const lineRange = `${startLine},${endLine}`;
      const lineSuffix = startLine === endLine ? startLine : lineRange;

      const path = vscode.workspace.asRelativePath(document.uri);
      const file = basename(path);

      runCommandInTerminal({
        name: `Line History: ${file}:${lineSuffix}`,
        icon: "history",
        command: `git log -L ${lineRange}:${path}`,
        context: { path },
      });
    }
  );

  const commitLinkProvider = vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({
      line,
      terminal,
    }): Promise<CommitTerminalLink[]> {
      const options = terminal.creationOptions;
      const path = isCustomTerminalOptions(options)
        ? options.context.path ?? null
        : null;

      const lineMatches = Array.from(line.matchAll(/([0-9a-f]{7,40})/g));

      const possibleMatches = await Promise.all(
        lineMatches.map(async ([match, commit]) => ({
          match,
          commit,
          valid: await isCommit(commit),
        }))
      );

      return possibleMatches
        .filter(({ valid }) => valid)
        .map(({ match, commit }) => {
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

    async handleTerminalLink({ context }: CommitTerminalLink) {
      const { commit: rawCommit, path } = context;
      const commit = await abbreviateCommit(rawCommit);

      if (path === null) {
        runCommandInTerminal({
          name: `Commit: ${commit}`,
          icon: "git-commit",
          command: `git show ${commit}`,
          context: { commit },
        });
      } else {
        const file = basename(path);

        const item = await vscode.window.showQuickPick(
          [
            {
              label: "Show Commit",
              description: commit,
              onSelected: () => {
                runCommandInTerminal({
                  name: `Commit: ${commit}`,
                  icon: "git-commit",
                  command: `git show ${commit}`,
                  context: { commit },
                });
              },
            },
            {
              label: "Show File Diff",
              description: `${file} (${commit})`,
              onSelected: () => {
                runCommandInTerminal({
                  name: `Diff: ${file} (${commit})`,
                  icon: "git-compare",
                  command: `git show ${commit} -- ${path}`,
                  context: { commit, path },
                });
              },
            },
            {
              label: "Show File at Commit",
              description: `${file} (${commit})`,
              onSelected: () => {
                runCommandInTerminal({
                  name: `File: ${file} (${commit})`,
                  icon: "file",
                  command: `git show ${commit}:${path}`,
                  context: { commit, path },
                });
              },
            },
          ],
          { placeHolder: "Choose a commit action..." }
        );

        item?.onSelected();
      }
    },
  });

  context.subscriptions.push(fileHistory, lineHistory, commitLinkProvider);
}

export function deactivate() {}
