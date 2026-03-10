# GitSquatch

> The missing link between Git and VS Code 👣

An extension that aims to bridge the gap between using the Git CLI and editing
in Visual Studio Code.

## Features

GitSquatch's functionality consists mainly of history-related commands and
providing interactive terminal links over Git's CLI output. Try viewing line
history from a diff editor or clicking a commit ID in the terminal, the way
these features integrate together let you blaze a trail through your
repository's history!

- [Selection Commands](#selection-commands)
  - [Selection History](#selection-history)
  - [Selection Blame](#selection-blame)
  - [Selection Search (Pickaxe)](#selection-search-pickaxe)
- [File/Folder Commands](#filefolder-commands)
  - [File History](#file-history)
  - [File Blame](#file-blame)
  - [Open File at Reference](#open-file-at-reference)
  - [Folder History](#folder-history)
- [Terminal Links](#terminal-links)
  - [Commit Links](#commit-links)
  - [Commit Range Links](#commit-range-links)
  - [File Links](#file-links)
  - [Branch/Tag Links](#branchtag-links)
  - [Issue Links](#issue-links)
- [File-at-Revision URI](#file-at-revision-uri)
- [Remote Integration](#remote-integration)

### Selection Commands

#### Selection History

View the change history of the current selection.

_Default Shortcut:_ `Alt + H`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_history.gif?raw=true"
width="500">

#### Selection Blame

View blame information for the current selection.

_Default Shortcut:_ `Alt + B`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_blame.gif?raw=true"
width="500">

> [!TIP]
> For both selection history and blame, multiple selections are supported.
> Added/deleted lines are taken into account so that the expected line ranges
> are used.

#### Selection Search (Pickaxe)

Search the history of the currently selected string (also known as ["pickaxe
search"](https://git-scm.com/book/en/v2/Git-Tools-Searching#_git_log_searching)).

_Default Shortcut:_ `Alt + S`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_search.gif?raw=true"
width="500">

### File/Folder Commands

#### File History

View the change history of a file.

_Default Shortcut (for current file):_ `Shift + Alt + H`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_history.gif?raw=true"
width="500">

#### File Blame

View blame information for a file.

_Default Shortcut (for current file):_ `Shift + Alt + B`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_blame.gif?raw=true"
width="500">

#### Open File at Reference

Open a file at a specific reference (branch/tag).

_Default Shortcut (for current file):_ `Shift + Alt + R`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/open_file_at_reference.gif?raw=true"
width="500">

> [!TIP]
> When viewing a file at a revision, go-to clicking a line (`Ctrl/Cmd+Click`)
> will navigate to the corresponding line in the working file.

#### Folder History

Right-click a folder from the Explorer view to view the change history of a
folder.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/folder_history.gif?raw=true"
width="500">

### Terminal Links

#### Commit Links

Click a commit ID to open the changes in an editor, copy the ID, open on remote,
and more.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/commit_link.gif?raw=true"
width="500">

#### Commit Range Links

Click a commit range when pulling to see what's changed.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/commit_range_link.gif?raw=true"
width="500">

#### File Links

Enhanced file links for all files in a repository, including files deleted in
past commits and files added in other branches.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_link.gif?raw=true"
width="500">

#### Branch/Tag Links

Quick actions for local branches, remote branches, and tags.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/reference_link.gif?raw=true"
width="500">

#### Issue Links

Open issues in your browser directly from a commit message.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/issue_link.gif?raw=true"
width="500">

### File-at-Revision URI

GitSquatch registers a URI scheme to handle opening a file at a given revision
(the `:<LINE>` portion is optional):

```
vscode://jaminthorns.gitsquatch/<COMMIT>:<PATH>:<LINE>
```

This can be used to configure terminal applications to output [OSC
8](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda) links to
navigate to a specific file revision.

### Remote Integration

GitSquatch can open commits, branches, files, issues, and more in your browser.
This functionality requires a "remote provider" module.

Providers are currently implemented for the following remotes:

- [GitHub](src/remoteProviders/GitHubProvider.ts)

## History

I used to be an avid user of
[GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens).
It's a great extension with plenty of useful features, but over time I found it
bloated and started preferring the Git CLI for most operations. VS Code offers
plenty of Git functionality out-of-the-box, but some commands I'd rather use the
CLI for, and others simply aren't available.

GitSquatch mainly exists for 2 reasons:

1. I wanted a way to execute certain Git CLI commands directly from an editor.
   Something like [viewing the history of a line range in a
   file](https://git-scm.com/docs/git-log#Documentation/git-log.txt--Lstartendfile)
   should be as simple as selecting some lines and pressing a keyboard shortcut.

2. The ability of VS Code extensions to [provide terminal
   links](https://code.visualstudio.com/docs/terminal/basics#_extensions-handling-links)
   means that I could turn Git's CLI output into more of an interactive
   interface while maintaining the flexibility of CLI usage.

This explains the bulk of this extension's functionality. I've added a few other
quality-of-life features that makes this the only Git-related VS Code extension
that I need.

GitSquatch is an extension built specifically around my preferences, and
therefore it has a very focused scope. It's not trying to be everything for
everyone, but I figure if another person enjoys using it, then it's worth
sharing and improving.
