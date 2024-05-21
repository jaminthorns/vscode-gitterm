interface FolderHistory {
  key: "folderHistory"
  variables: { revision: string; folder: string }
}

interface FileHistory {
  key: "fileHistory"
  variables: { revision: string; filename: string }
}

interface LineHistory {
  key: "lineHistory"
  variables: { revision: string; fileLineRanges: string }
}

// TODO: Consider consolidating into single Blame command.
interface FileBlame {
  key: "fileBlame"
  variables: { revision: string; filename: string }
}

interface LineBlame {
  key: "lineBlame"
  variables: { revision: string; filename: string; lineRanges: string }
}

interface RevisionHistory {
  key: "revisionHistory"
  variables: { revision: string }
}

interface ShowRevision {
  key: "showRevision"
  variables: { revision: string }
}

interface ShowFileDiffAtRevision {
  key: "showFileDiffAtRevision"
  variables: { revision: string; filename: string }
}

interface ShowFileAtRevision {
  key: "showFileAtRevision"
  variables: { revision: string; filename: string }
}

type UserGitCommand =
  | FolderHistory
  | FileHistory
  | LineHistory
  | FileBlame
  | LineBlame
  | RevisionHistory
  | ShowRevision
  | ShowFileDiffAtRevision
  | ShowFileAtRevision

export default UserGitCommand
