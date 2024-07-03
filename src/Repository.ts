import { resolve } from "path"
import * as vscode from "vscode"
import {
  FilenameStore,
  LocalBranchStore,
  ReferenceStore,
  RemoteBranchStore,
  RemoteProviderStore,
  TagStore,
} from "./stores"
import { git } from "./util"

export interface Repository extends vscode.Disposable {
  directory: vscode.Uri
  remoteProviders: RemoteProviderStore
  filenames: FilenameStore
  localBranches: ReferenceStore
  remoteBranches: ReferenceStore
  tags: ReferenceStore
}

export async function Repository(
  folder: vscode.WorkspaceFolder,
): Promise<Repository> {
  const directory = folder.uri

  const gitDirRel = await git("rev-parse", ["--git-common-dir"], { directory })
  const gitDirAbs = resolve(directory.fsPath, gitDirRel)
  const gitDirectory = vscode.Uri.parse(gitDirAbs)

  const remoteProviders = RemoteProviderStore(directory, gitDirectory)
  const filenames = await FilenameStore(directory, gitDirectory)
  const localBranches = LocalBranchStore(directory, gitDirectory)
  const remoteBranches = RemoteBranchStore(directory, gitDirectory)
  const tags = TagStore(directory, gitDirectory)

  return {
    directory,
    remoteProviders,
    filenames,
    localBranches,
    remoteBranches,
    tags,

    dispose() {
      remoteProviders.dispose()
      filenames.dispose()
      localBranches.dispose()
      remoteBranches.dispose()
      tags.dispose()
    },
  }
}
