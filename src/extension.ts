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
      runCommand(`git rev-parse '${raw}'`),
      runCommand(`git rev-parse --short '${raw}'`),
    ]);

    return { full, abbreviated };
  } catch (error) {
    return null;
  }
}

function chunk<T>(array: T[], count: number): T[][] {
  return array.reduce((chunks: T[][], value, index) => {
    const chunkIndex = Math.floor(index / count);

    if (chunks[chunkIndex] === undefined) {
      chunks[chunkIndex] = [];
    }

    chunks[chunkIndex].push(value);
    return chunks;
  }, []);
}

async function pathAtCommit(
  currentPath: string,
  targetCommit: Commit
): Promise<string | null> {
  try {
    const commitPaths = await runCommand(
      `git log --follow --name-only --format="%H" -- '${currentPath}'`
    );

    const { path } =
      chunk(commitPaths.split(/\n+/), 2)
        .map(([commit, path]) => ({ commit, path }))
        .find(({ commit }) => commit === targetCommit.full) ?? {};

    return path ?? null;
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

  const matches = Array.from(command.matchAll(CONFIG_VARIABLE_PATTERN));

  return matches.reduce((command, [substitution, contextKey]) => {
    return command.replace(substitution, context[contextKey]);
  }, command);
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
      let selectedItem;
      const { commit, path } = context;
      const placeHolder = `Select an action for commit ${commit.abbreviated}`;

      const commitPath =
        path === null ? null : await pathAtCommit(path, commit);

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

      if (commitPath === null) {
        selectedItem = await vscode.window.showQuickPick(commitItems, {
          placeHolder,
        });
      } else {
        const file = basename(commitPath);
        const context = { commit, path: commitPath };
        const commandContext = { commit: commit.full, path: commitPath };

        const fileItems = [
          {
            label: "$(git-compare) Show File Diff",
            description: commitPath,
            onSelected: () => {
              runCommandInTerminal({
                name: `Diff: ${file} (${commit.abbreviated})`,
                icon: "git-compare",
                context,
                command: gitCommand("showFileDiffAtCommit", commandContext),
              });
            },
          },
          {
            label: "$(file) Show File at Commit",
            description: commitPath,
            onSelected: () => {
              runCommandInTerminal({
                name: `File: ${file} (${commit.abbreviated})`,
                icon: "file",
                context,
                command: gitCommand("showFileContentsAtCommit", commandContext),
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
