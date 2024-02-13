export type ReferenceType = "branch" | "remote" | "tag"

export const referenceInfo: Record<
  ReferenceType,
  { label: string; icon: string }
> = {
  branch: { icon: "git-branch", label: "Branch" },
  remote: { icon: "git-branch", label: "Branch" },
  tag: { icon: "tag", label: "Tag" },
}
