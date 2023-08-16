# Ideas

This is a rough notepad of ideas related to the design and planning of this
extension.

## Link Types

### File Links

- Actions
  - Open File (when exists on disk)
  - Copy Filename
  - Show File Diff (when commit context)
  - Show File at Commit (when commit context)
  - Open File on <REMOTE> (when commit context)

### Branch/Tag Links

- Actions
  - Show History from Branch/Tag
  - Copy Branch/Tag Name
  - Open Branch/Tag on <REMOTE>

### Person Links

- Actions
  - Show Authored Commits
  - Show Committed Commits

### Stash Links

- Actions
  - Show Stash
  - Copy Stash Name

## Link Detection Methods

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

## Shell Integration

Wrap the `git` command in the user's shell using a function. This wrapper would
send the arguments of the executed command to GitTerm, which would allow GitTerm
to contextualize a terminal so that better link actions can be provided.
