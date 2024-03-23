import { basename } from "path"
import * as vscode from "vscode"
import Remote from "./Remote"
import RemoteProvider from "./RemoteProvider"
import { excludeNulls, git } from "./util"

export default interface RemoteProviderStore extends vscode.Disposable {
  sorted(): RemoteProvider[]
}

export default function RemoteProviderStore(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
): RemoteProviderStore {
  const providers: Map<string, RemoteProvider> = new Map()
  const remoteWatcher = setupRemoteWatcher(directory, gitDirectory, providers)

  loadProviders(directory, providers)

  return {
    sorted() {
      return Array.from(providers.values()).sort((a, b) => {
        // Show "origin" remote at the top with the rest sorted alphabetically.
        switch (true) {
          case a.remote.name === "origin":
            return -1
          case b.remote.name === "origin":
            return 1
          default:
            return a.remote.name.localeCompare(b.remote.name)
        }
      })
    },

    dispose() {
      remoteWatcher.dispose()
    },
  }
}

function setupRemoteWatcher(
  directory: vscode.Uri,
  gitDirectory: vscode.Uri,
  providers: Map<string, RemoteProvider>,
): vscode.FileSystemWatcher {
  const dir = vscode.Uri.joinPath(gitDirectory, "refs", "remotes")
  const pattern = new vscode.RelativePattern(dir, "*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate(async (uri) => {
    const name = basename(uri.fsPath)
    const remote = await Remote(name, directory)

    if (remote !== null) {
      providers.set(name, RemoteProvider(remote))
    }
  })

  watcher.onDidDelete(async (uri) => {
    providers.delete(basename(uri.fsPath))
  })

  return watcher
}

export async function loadProviders(
  directory: vscode.Uri,
  providers: Map<string, RemoteProvider>,
): Promise<void> {
  const output = await git("remote", [], { directory })
  const names = output === "" ? [] : output.split("\n")
  const remotes = await Promise.all(names.map((n) => Remote(n, directory)))
  const remoteProviders = excludeNulls(remotes).map(RemoteProvider)

  remoteProviders.forEach((provider) => {
    providers.set(provider.remote.name, provider)
  })
}
