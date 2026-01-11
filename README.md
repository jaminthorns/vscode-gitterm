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

### View change history for a folder

<figure>
  <img src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/folder_history.gif?raw=true" width="500">
  <figcaption>Folder History</figcaption>
</figure>

### View change history and blame for a whole file

<figure>
  <img src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_history.gif?raw=true" width="500">
  <figcaption>File History</figcaption>
</figure>

<figure>
  <img src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/file_blame.gif?raw=true" width="500">
  <figcaption>File Blame</figcaption>
</figure>

### View change history and blame for the current selection

<figure>
  <img src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_history.gif?raw=true" width="500">
  <figcaption>Selection History</figcaption>
</figure>

<figure>
  <img src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_blame.gif?raw=true" width="500">
  <figcaption>Selection Blame</figcaption>
</figure>

💡 Multiple selections are supported, and modified lines are taken into account
so that the expected line ranges are used.

### Open a file at a specific reference

<figure>
  <img src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/open_file_at_reference.gif?raw=true" width="500">
  <figcaption>Open File at Reference</figcaption>
</figure>

### Search the history of a specific string (also known as ["pickaxe search"](https://git-scm.com/book/en/v2/Git-Tools-Searching#_git_log_searching))

<figure>
  <img src="https://github.com/jaminthorns/vscode-gitterm/blob/squatch/assets/demos/selection_search.gif?raw=true" width="500">
  <figcaption>Selection Search</figcaption>
</figure>

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

### File at Revision Line Navigation

When viewing a file at a revision, go-to clicking will navigate to corresponding
line in working file.

### Remote Integration

Open commits, references, and issues on supported remotes:

- [GitHub](src/remoteProviders/GitHubProvider.ts)
