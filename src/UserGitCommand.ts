import { RawCommit } from "./Commit"

interface FolderHistory {
  key: "folderHistory"
  variables: { folder: string; commit: RawCommit }
}

interface FileHistory {
  key: "fileHistory"
  variables: { filename: string; commit: RawCommit }
}

interface LineHistory {
  key: "lineHistory"
  variables: {
    filename: string
    commit: RawCommit
    startLine: number
    endLine: number
  }
}

interface FileBlame {
  key: "fileBlame"
  variables: { filename: string }
}

interface CommitHistory {
  key: "commitHistory"
  variables: { commit: RawCommit }
}

interface ShowCommit {
  key: "showCommit"
  variables: { commit: RawCommit }
}

interface ShowFileDiffAtCommit {
  key: "showFileDiffAtCommit"
  variables: { filename: string; commit: RawCommit }
}

interface ShowFileContentsAtCommit {
  key: "showFileContentsAtCommit"
  variables: { filename: string; commit: RawCommit }
}

type UserGitCommand =
  | FolderHistory
  | FileHistory
  | LineHistory
  | FileBlame
  | CommitHistory
  | ShowCommit
  | ShowFileDiffAtCommit
  | ShowFileContentsAtCommit

export default UserGitCommand
