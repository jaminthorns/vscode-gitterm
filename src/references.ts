import { basename, extname } from "path"
import * as vscode from "vscode"
import { git } from "./util"

export type ReferenceType = "branch" | "remote" | "tag"

export const referenceInfo: Record<
  ReferenceType,
  {
    label: string
    remoteLabel: string
    directory: string
    disambiguate: { label: string; icon: string }
  }
> = {
  branch: {
    label: "Branch",
    remoteLabel: "Upstream Branch",
    directory: "heads",
    disambiguate: { icon: "git-branch", label: "Local Branch" },
  },
  remote: {
    label: "Remote Branch",
    remoteLabel: "Branch",
    directory: "remotes",
    disambiguate: { icon: "cloud", label: "Remote Branch" },
  },
  tag: {
    label: "Tag",
    remoteLabel: "Tag",
    directory: "tags",
    disambiguate: { icon: "tag", label: "Tag" },
  },
}

export function ignoreReferenceFile(uri: vscode.Uri): boolean {
  const isHead = basename(uri.fsPath) === "HEAD"
  const isLock = extname(uri.fsPath) === ".lock"

  return isHead || isLock
}

export async function referenceValid(
  ref: string,
  type: ReferenceType,
  directory: vscode.Uri,
): Promise<boolean> {
  try {
    const refDir = referenceInfo[type].directory
    await git("show-ref", ["--verify", `refs/${refDir}/${ref}`], { directory })

    return true
  } catch (error) {
    return false
  }
}
