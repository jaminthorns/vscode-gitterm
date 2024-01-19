interface FolderHistory {
  key: "folderHistory"
  variables: { folder: string; revision: string }
}

interface FileHistory {
  key: "fileHistory"
  variables: { filename: string; revision: string }
}

interface LineHistory {
  key: "lineHistory"
  variables: {
    filename: string
    revision: string
    startLine: number
    endLine: number
  }
}

interface FileBlame {
  key: "fileBlame"
  variables: { filename: string }
}

interface LineBlame {
  key: "lineBlame"
  variables: {
    filename: string
    startLine: number
    endLine: number
  }
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
  variables: { filename: string; revision: string }
}

interface ShowFileContentsAtRevision {
  key: "showFileContentsAtRevision"
  variables: { filename: string; revision: string }
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
  | ShowFileContentsAtRevision

export default UserGitCommand
