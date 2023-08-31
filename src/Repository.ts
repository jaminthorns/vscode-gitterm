import * as vscode from "vscode"
import FilenameStore from "./FilenameStore"
import RemoteProvider, { createRemoteProviders } from "./RemoteProvider"

export default interface Repository extends vscode.Disposable {
  directory: vscode.Uri
  remotes: RemoteProvider[]
  filenames: FilenameStore
}

export default async function Repository(
  folder: vscode.WorkspaceFolder,
): Promise<Repository> {
  const directory = folder.uri

  const [remotes, filenames] = await Promise.all([
    await createRemoteProviders(directory),
    await FilenameStore(directory),
  ])

  return {
    directory,
    remotes,
    filenames,

    dispose() {
      filenames.dispose()
    },
  }
}
