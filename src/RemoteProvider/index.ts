import { Remote } from "../Remote"
import { GitHubProvider } from "./GitHubProvider"
import { RemoteProvider as RemoteProviderType } from "./RemoteProvider"
import { UnsupportedProvider } from "./UnsupportedProvider"

export type RemoteProvider = RemoteProviderType

export function RemoteProvider(remote: Remote): RemoteProviderType {
  switch (remote.server.host) {
    case "github.com":
      return GitHubProvider(remote)
    default:
      return UnsupportedProvider(remote)
  }
}
