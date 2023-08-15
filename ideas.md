# Ideas

This is a rough notepad of ideas related to the design and planning of this
extension.

## Link Types

### Commit Links

- Actions
  - ...
  - Open Commit on <REMOTE>
  - Switch to Commit (Detached)

### File Links

- Actions
  - Open File
  - Open File on <REMOTE>
  - Show File at Commit
  - Copy Filename

### Branch Links

- Actions
  - Show Branch History
  - Open Branch on <REMOTE>
  - Switch to Branch
  - Copy Branch Name

### Person Links

- Actions
  - Show Commits Authored By
  - Show Commits Commit By

### Stash Links

- Actions
  - Show Stash
  - Copy Stash Name
  - Modification actions (these could be dangerous since stashes shift in the
    stack)
    - Pop Stash
    - Apply Stash
    - Drop Stash

## Link Matching Methods

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
