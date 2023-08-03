import * as vscode from "vscode";
import { basename } from "path";
import { exec } from "child_process";

interface Commit {
  full: string;
  abbreviated: string;
}

interface TerminalOptionsWithContext extends vscode.TerminalOptions {
  context: any;
}

interface CommitTerminalLink extends vscode.TerminalLink {
  context: {
    commit: Commit;
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

async function parseCommit(raw: string): Promise<Commit | null> {
  try {
    const [full, abbreviated] = await Promise.all([
      runCommand(`git rev-parse ${raw}`),
      runCommand(`git rev-parse --short ${raw}`),
    ]);

    return { full, abbreviated };
  } catch (error) {
    return null;
  }
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

const CONFIG_VARIABLE_PATTERN = /\${(\w+)}/g;

function gitCommand(commandKey: string, context: Record<string, any>): string {
  let command = vscode.workspace
    .getConfiguration("gitterm.gitCommands")
    .get(commandKey) as string;

  for (const match of command.matchAll(CONFIG_VARIABLE_PATTERN)) {
    const [substitution, contextKey] = match;
    command = command.replace(substitution, context[contextKey]);
  }

  return command;
}

export function activate(context: vscode.ExtensionContext) {
  const fileHistory = vscode.commands.registerTextEditorCommand(
    "gitterm.fileHistory",
    ({ document }: vscode.TextEditor) => {
      const path = vscode.workspace.asRelativePath(document.uri);
      const file = basename(path);

      runCommandInTerminal({
        name: `History: ${file}`,
        icon: "history",
        command: gitCommand("fileHistory", { path }),
        context: { path },
      });
    }
  );

  const lineHistory = vscode.commands.registerTextEditorCommand(
    "gitterm.lineHistory",
    ({ selection, document }: vscode.TextEditor) => {
      const startLine = selection.start.line + 1;
      const endLine = selection.end.line + 1;
      const lineRange = `${startLine},${endLine}`;
      const lineSuffix = startLine === endLine ? startLine : lineRange;

      const path = vscode.workspace.asRelativePath(document.uri);
      const file = basename(path);

      runCommandInTerminal({
        name: `History: ${file}:${lineSuffix}`,
        icon: "history",
        command: gitCommand("lineHistory", { path, startLine, endLine }),
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
        lineMatches.map(async ([match, rawCommit]) => {
          const commit = await parseCommit(rawCommit);

          if (commit === null) {
            return null;
          } else {
            const matchStart = line.indexOf(match);
            const startIndex = matchStart + match.indexOf(rawCommit);

            return {
              startIndex,
              length: rawCommit.length,
              tooltip: "Pick a commit action",
              context: { commit, path },
            };
          }
        })
      );

      return possibleMatches.filter((l) => l !== null) as CommitTerminalLink[];
    },

    async handleTerminalLink({ context }: CommitTerminalLink) {
      const { commit, path } = context;
      const placeHolder = `Select an action for commit ${commit.abbreviated}`;

      const commitItems = [
        {
          label: "$(git-commit) Show Commit",
          onSelected: () => {
            runCommandInTerminal({
              name: `Commit: ${commit.abbreviated}`,
              icon: "git-commit",
              command: gitCommand("showCommit", { commit: commit.full }),
              context: { commit },
            });
          },
        },
        {
          label: "$(files) Copy Commit to Clipboard",
          onSelected: () => {
            vscode.env.clipboard.writeText(commit.full);
          },
        },
      ];

      let selectedItem;

      if (path === null) {
        selectedItem = await vscode.window.showQuickPick(commitItems, {
          placeHolder,
        });
      } else {
        const file = basename(path);

        const fileItems = [
          {
            label: "$(git-compare) Show File Diff",
            description: file,
            onSelected: () => {
              runCommandInTerminal({
                name: `Diff: ${file} (${commit.abbreviated})`,
                icon: "git-compare",
                command: gitCommand("showFileDiffAtCommit", {
                  commit: commit.full,
                  path,
                }),
                context: { commit, path },
              });
            },
          },
          {
            label: "$(file) Show File at Commit",
            description: file,
            onSelected: () => {
              runCommandInTerminal({
                name: `File: ${file} (${commit.abbreviated})`,
                icon: "file",
                command: gitCommand("showFileContentsAtCommit", {
                  commit: commit.full,
                  path,
                }),
                context: { commit, path },
              });
            },
          },
        ];

        selectedItem = await vscode.window.showQuickPick(
          [...commitItems, ...fileItems],
          { placeHolder }
        );
      }

      selectedItem?.onSelected();
    },
  });

  context.subscriptions.push(fileHistory, lineHistory, commitLinkProvider);
}

export function deactivate() {}
