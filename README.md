# GitSquatch

The missing link between Git and Visual Studio Code.

## Philosophy

I used to be an avid user of
[GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens),
but over time I found it bloated and started preferring the Git CLI for
repository operations. VS Code has also added plenty of Git functionality as
it's matured, so the need for a something like GitLens has diminished in my
opinion.

I figured I could build out the few features I needed into my own extension, so
that's how this project started. As I added more functionality, I figured this
might be something that others could use.

Because of this history, GitSquatch has a very focused scope. The only
functionality provided is read-only, nothing that will modify your Git
repository. I favor using the Git CLI, and VS Code has plenty of that
functionality built out already.

Where VS Code's Git features fall a bit short is in the "history investigation"
area, although this is improving with things like [blame
annotations](https://code.visualstudio.com/docs/sourcecontrol/overview#:~:text=Git%20blame%20annotations),
[the commit
graph](https://code.visualstudio.com/docs/sourcecontrol/staging-commits#_graph-view-for-commit-history),
and [the timeline
view](https://code.visualstudio.com/docs/sourcecontrol/staging-commits#_timeline-view-for-file-history).

So, if you prefer using the Git CLI and want a minimal extension to bridge some
gaps where needed, maybe you should try GitSquatch.

## Features

### Folder History

Right-click a folder from the Explorer view to view change history for a folder.

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/folder_history.gif?raw=true"
width="500">

### File History/Blame

View change history for a file.

*Default Shortcut:* `Shift + Alt + H`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_history.gif?raw=true"
width="500">

View blame information for a file.

*Default Shortcut:* `Shift + Alt + B`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_blame.gif?raw=true"
width="500">

### Open File at Reference

Quickly open the active file at a specific reference.

*Default Shortcut:* `Shift + Alt + R`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/open_file_at_reference.gif?raw=true"
width="500">

💡 When viewing a file at a revision, go-to clicking (`Ctrl/Cmd + Click`) will
navigate to corresponding line in the working file.

### Selection History/Blame

View change history for the current selection.

*Default Shortcut:* `Alt + H`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_history.gif?raw=true"
width="500">

View blame information for the current selection.

*Default Shortcut:* `Alt + B`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_blame.gif?raw=true"
width="500">

💡 Multiple selections are supported, and modified lines are taken into account
so that the expected line ranges are used.

### Selection Search (Pickaxe)

Search the history of the currently selected string (also known as ["pickaxe
search"](https://git-scm.com/book/en/v2/Git-Tools-Searching#_git_log_searching)).

*Default Shortcut:* `Alt + S`

<img
src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_search.gif?raw=true"
width="500">

### Terminal Links

- Commits
- Commit ranges
- Files (links for all files in repository, not just in working tree)
- Local Branches
- Remote Branches
- Tags
- Issues

Links in terminals opened from commands take contextual info into account.

### URI Handling

Use to configure terminal applications to output [OSC
8](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda) links to
navigate directly to file at a revision.

### Remote Integration

Open commits, references, and issues on supported remotes:

- [GitHub](src/remoteProviders/GitHubProvider.ts)
