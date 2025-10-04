# Ideas

This is a rough notepad of ideas related to the design and planning of this
extension.

Legend:

- ❗ Required before release
- 🤔 Maybe in the future
- 📝 Documentation

## Link Types

### File Links 🤔

- Actions

  - Open File on Remote

    This would open the file on the remote's default branch. You can get the
    remote's default branch with:

    ```
    git rev-parse --abbrev-ref origin/HEAD
    ```

    Which will only be set if the repository has been cloned or if this command
    has been run:

    ```
    git remote set-head --auto origin
    ```

    So in order to open a file on the remote, you need to get the remote's
    default branch (running `git remote set-head ...` if necessary), and offer
    to open the file only if it exists on that branch.

For GitHub at least, this is covered by the "Copy GitHub Link" commands. It
could be nice to have, but does it really fall under the responsibility of
GitTerm?

### Person Links 🤔

Command: `git shortlog --all --summary --numbered --email`

- Actions
  - History of Authored Commits
  - History of Committed Commits

I'm not sure how useful this would actually be in practice. I've only ever used
committer/author filtering in conjuction with other `git log` filters.

### Stash Links 🤔

- Actions

  - Show Stash

    The `stashView` function in `extensions/git/src/commands.ts` in the VS Code
    repo gives an example of how to show a stash in a multi-diff editor.

  - Copy Stash Name

This would be nice to have for parity with commit links, but it's not nearly as
useful since VS Code already has stash listing functionality built-in.

## Link Detection Methods 📝

- Parsing

  If you can decide whether a link is valid purely by parsing alone (no false
  negatives or false positives), then this is the best option.

- Parsing + validation

  When parsing gives you no false negatives but possibly false positives, then
  you can combine it with a validation step. The validation step needs to be
  relatively quick, since it's kicked off when a line is hovered. If parsing
  alone can't be used, but parsing with validation can, then this is the best
  option.

- Collection matching

  This is a completely different approach that involves creating an initial
  collection of valid link candidates, and then checking for matches to find
  links. As long as the candidates can be populated relatively quickly either at
  extension activation or terminal creation, then this can be made efficient
  with `StringTrie`.

  This approach avoids the limitations of parsing and is good for matching links
  that don't have a definite pattern. A downside is that the candidate
  collection must be kept up-to-date, which adds complexity. If parsing (with or
  without validation) is not an option, then this is the only remaining option.

## Shell Integration 🤔

Wrap the `git` command in the user's shell using a function. This wrapper would
send the arguments of the executed command to GitTerm, which would allow GitTerm
to contextualize a terminal so that better link actions can be provided.

This has some considerations:

- How would this be made cross-platform?

  We can modify the user's `PATH`, but what kind of executable would be shipped?
  If a shell function, then we'd need to make a separate script for each shell.
  If a binary, then we'd to ship a cross-platform binary.

- How does the function communicate with GitTerm?

  A web server is all that I can think of. The part that runs in the shell only
  needs to send information to GitTerm, so something like `curl` can be used.

## Workspace Detection within Terminal 📝

To get the workspace folder for a terminal, the best method would be to:

- Detect the current working directory of the terminal.
- Use the
  [`getWorkspaceFoler`](https://code.visualstudio.com/api/references/vscode-api#workspace.getWorkspaceFolder)
  function to get the workspace folder corresponding to that working directory.

This would provide the most consistent behavior because regardless of the
directory that the terminal started in, you can navigate to one of the workspace
folders (that have a Git repository) and get proper link detection.

For macOS and Linux, you can just use the `lsof` command:

```shell
lsof -a -d cwd -p 1234
```

For Windows, you need to use the [`ReadProcessMemory`
function](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-readprocessmemory)
to read the [Process Environment
Block](https://learn.microsoft.com/en-us/windows/win32/api/winternl/ns-winternl-peb),
which is used internally by Windows and not documented.
[Here](https://github.com/310ken1/AutoItSciTEj/blob/master/language/au3/Include/WinAPIProc.au3#L883)
is an example of someone accessing this undocumented functionality and getting
the current working directory of a process.

Running commands to find this information may not be ideal, though, since we
need the information on link hover, and it could be expensive to re-fetch this
information.

Alternatively, we could use a less reliable but more "static" approach:

- If the terminal was created by an editor command, associate the terminal with
  the workspace folder of the editor.
- If there is only 1 workspace, just use that.

This doesn't cover terminals created by the user when there is more than 1
workspace.

# Editor Title Buttons per File in Commit Editors 🤔

In commit editors, we can add buttons using the `multiDiffEditor/resource/title`
menu contribution point. This could be used to open a menu per file or put some
relevant actions.

I'd like for this to be a ❗, but it's currently only a proposed API, available
by enabling `contribMultiDiffEditorMenus`.

# View File from Another Reference ❗

When working on a file in some feature branch, I often want to view the file as
it is in `main` or some other branch to compare side-by-side. This is easy to do
with `git show <REF>:<FILE>`.

There should be a command (with a default keybinding) that lets you select a
reference (branch/tag/commit) to view the active file at.

This should also be available as a context menu command when viewing diffs.

# Use `Pseudoterminal` for running commands 🤔

Using a `Pseudoterminal` could provide a cleaner experience when running
commands. The user wouldn't be able to reuse the terminal by exiting to the
shell, which could be benefit or a drawback depending on the situation. A
benefit would be that Git commands could be specified in a shell-agnostic way.
This might make more sense architecturally and alleviate string-escaping issues.

# Notification when attempting operations on non-tracked file ❗

I tried to see the file history on a file that wasn't in the repo that I had
opened. When I pressed the hotkeys, nothing happened, but it would have been
more informative if a notification was shown. I'm not sure what should happen if
a file is from another repo.
