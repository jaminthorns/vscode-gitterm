import { resolve } from "path"
import * as vscode from "vscode"
import FilenameStore from "./FilenameStore"
import RemoteProviderStore from "./RemoteProviderStore"
import { git } from "./util"

export default interface Repository extends vscode.Disposable {
  directory: vscode.Uri
  remoteProviders: RemoteProviderStore
  filenames: FilenameStore
}

export default async function Repository(
  folder: vscode.WorkspaceFolder,
): Promise<Repository> {
  const directory = folder.uri

  const gitDirRel = await git("rev-parse", ["--git-common-dir"], { directory })
  const gitDirAbs = resolve(directory.fsPath, gitDirRel)
  const gitDirectory = vscode.Uri.parse(gitDirAbs)

  const remoteProviders = RemoteProviderStore(directory, gitDirectory)
  const filenames = await FilenameStore(directory, gitDirectory)

  return {
    directory,
    remoteProviders,
    filenames,

    dispose() {
      remoteProviders.dispose()
      filenames.dispose()
    },
  }
}
