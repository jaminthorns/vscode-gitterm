import { RawCommit } from "./Commit"

interface FileHistory {
  key: "fileHistory"
  variables: { filename: string }
}

interface LineHistory {
  key: "lineHistory"
  variables: { filename: string; startLine: number; endLine: number }
}

interface FileBlame {
  key: "fileBlame"
  variables: { filename: string }
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
  | FileHistory
  | LineHistory
  | FileBlame
  | ShowCommit
  | ShowFileDiffAtCommit
  | ShowFileContentsAtCommit

export default UserGitCommand
