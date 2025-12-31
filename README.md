# GitTerm

## Features

### Commands

- Folder history
- File history
- Selection history (takes added/deleted lines into account)
- File blame
- Selection blame (takes added/deleted lines into account)
- Open file at reference
- Selection search

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
