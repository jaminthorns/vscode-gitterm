import * as vscode from "vscode"
import FilenameStore from "./FilenameStore"
import RemoteProvider, { createRemoteProviders } from "./RemoteProvider"

export default interface Repository extends vscode.Disposable {
  directory: vscode.Uri
  remoteProviders: RemoteProvider[]
  filenames: FilenameStore
}

export default async function Repository(
  folder: vscode.WorkspaceFolder,
): Promise<Repository> {
  const directory = folder.uri

  const [remoteProviders, filenames] = await Promise.all([
    // TODO: Refresh on remote change
    await createRemoteProviders(directory),
    await FilenameStore(directory),
  ])

  return {
    directory,
    remoteProviders,
    filenames,

    dispose() {
      filenames.dispose()
    },
  }
}
