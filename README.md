# GitSquatch

> The missing link between Git and VS Code

An extension that tries to bridge the gap between using the Git CLI and editing
in Visual Studio Code.

## Features

GitSquatch's functionality mainly consists of editor commands (with default
keyboard shortcuts) and providing terminal links to enhance Git CLI output.

### Folder History

Right-click a folder from the Explorer view to view change history for a folder.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/folder_history.gif?raw=true"
width="500">

### File History

View change history for a file.

_Default Shortcut:_ `Shift + Alt + H`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_history.gif?raw=true"
width="500">

### File Blame

View blame information for a file.

_Default Shortcut:_ `Shift + Alt + B`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_blame.gif?raw=true"
width="500">

### Open File at Reference

Quickly open the active file at a specific reference.

_Default Shortcut:_ `Shift + Alt + R`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/open_file_at_reference.gif?raw=true"
width="500">

💡 When viewing a file at a revision, go-to clicking (`Ctrl/Cmd + Click`) will
navigate to the corresponding line in the working file.

### Selection History

View change history for the current selection.

_Default Shortcut:_ `Alt + H`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_history.gif?raw=true"
width="500">

### Selection Blame

View blame information for the current selection.

_Default Shortcut:_ `Alt + B`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_blame.gif?raw=true"
width="500">

💡 For both selection history and selection blame, multiple selections are
supported, and modified lines are taken into account so that the expected line
ranges are used.

### Selection Search (Pickaxe)

Search the history of the currently selected string (also known as ["pickaxe
search"](https://git-scm.com/book/en/v2/Git-Tools-Searching#_git_log_searching)).

_Default Shortcut:_ `Alt + S`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_search.gif?raw=true"
width="500">

### Commit Links

Click a commit ID to open in an editor, copy the ID, open on remote, and more.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/commit_link.gif?raw=true"
width="500">

### Commit Range Links

Click a commit range when pulling to see what's changed.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/commit_range_link.gif?raw=true"
width="500">

### File Links

Enhanced file links for all files in a repository, not just in the working tree.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_link.gif?raw=true"
width="500">

### Branch/Tag Links

Quick actions for local branches, remote branches, and tags.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/reference_link.gif?raw=true"
width="500">

### Issue Links

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

GitSquatch offers the ability to open commits, references, issues, and more in
your browser. This functionality requires a "remote provider" to be implemented.

The following remote providers are implemented:

- [GitHub](src/remoteProviders/GitHubProvider.ts)

## History

I used to be an avid user of
[GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens).
It's a wonderful extension, but over time I found it bloated and started
preferring the Git CLI for most things. VS Code offers plenty of Git
functionality out-of-the-box, but there's a specific lack in the "history
investigation" area (though there are features like [blame
annotations](https://code.visualstudio.com/docs/sourcecontrol/overview#:~:text=Git%20blame%20annotations),
[the commit
graph](https://code.visualstudio.com/docs/sourcecontrol/staging-commits#_graph-view-for-commit-history),
and [the timeline
view](https://code.visualstudio.com/docs/sourcecontrol/staging-commits#_timeline-view-for-file-history)).

GitSquatch mainly exists for 2 reasons:

1. I wanted a way to execute certain Git commands directly from an editor.
   Something like [viewing the history of a line range in a
   file](https://git-scm.com/docs/git-log#Documentation/git-log.txt--Lstartendfile)
   should be as simple as selecting a region and pressing a keyboard shortcut.

2. The ability of VS Code extensions to provide terminal links means that I
   could turn Git's CLI output into more of an interactive interface while
   maintaining all the flexibility of CLI usage.

This explains the bulk of this extension's functionality (editor commands and
terminal links). I've added a few other quality-of-life features that makes this
the only Git-related VS Code extension that I use.

GitSquatch is an extension built specifically around my needs, and therefore it
has a very focused scope. It's definitely not trying to be everything for
everyone, but I figure if another person enjoys using it, then it's worth
sharing and improving.
