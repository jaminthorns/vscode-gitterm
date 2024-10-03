import * as vscode from "vscode"
import { Remote } from "../Remote"
import { RemoteProvider } from "./RemoteProvider"

export function UnsupportedProvider(remote: Remote): RemoteProvider {
  function showNotSupportedMessage() {
    const message = `Remote server not supported: ${remote.server.host}`
    vscode.window.showErrorMessage(message)
  }

  return {
    remote,
    label: `${remote.name} (Unsupported)`,

    commitUrl() {
      showNotSupportedMessage()
      return null
    },

    referenceUrl() {
      showNotSupportedMessage()
      return null
    },

    fileAtCommitUrl() {
      showNotSupportedMessage()
      return null
    },

    uriRevision() {
      return null
    },
  }
}
