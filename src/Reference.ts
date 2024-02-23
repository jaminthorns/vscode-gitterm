export type ReferenceType = "branch" | "remote" | "tag"

export const referenceInfo: Record<
  ReferenceType,
  { label: string; icon: string; directory: string }
> = {
  branch: { icon: "git-branch", label: "Branch", directory: "heads" },
  remote: { icon: "git-branch", label: "Branch", directory: "remotes" },
  tag: { icon: "tag", label: "Tag", directory: "tags" },
}
