import { basename, extname } from "path"
import * as vscode from "vscode"
import { git } from "./util"

export type ReferenceType = "localBranch" | "remoteBranch" | "tag"

export const referenceInfo: Record<
  ReferenceType,
  {
    label: string
    icon: string
    remoteLabel: string
    directory: string
  }
> = {
  localBranch: {
    label: "Branch",
    remoteLabel: "Upstream Branch",
    icon: "git-branch",
    directory: "heads",
  },
  remoteBranch: {
    label: "Remote Branch",
    remoteLabel: "Branch",
    icon: "cloud",
    directory: "remotes",
  },
  tag: {
    label: "Tag",
    remoteLabel: "Tag",
    icon: "tag",
    directory: "tags",
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
