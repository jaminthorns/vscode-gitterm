import { createReferenceLinkMatcher } from "./createReferenceLinkMatcher"

export const LocalBranchLinkMatcher = createReferenceLinkMatcher({
  type: "localBranch",
  store: "localBranches",
})
