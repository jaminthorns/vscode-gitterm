export type ReferenceType = "branch" | "remote" | "tag"

export const referenceInfo: Record<
  ReferenceType,
  {
    label: string
    directory: string
    disambiguate: { label: string; icon: string }
  }
> = {
  branch: {
    label: "Branch",
    directory: "heads",
    disambiguate: { icon: "git-branch", label: "Local Branch" },
  },
  remote: {
    label: "Branch",
    directory: "remotes",
    disambiguate: { icon: "globe", label: "Remote Branch" },
  },
  tag: {
    label: "Tag",
    directory: "tags",
    disambiguate: { icon: "tag", label: "Tag" },
  },
}
