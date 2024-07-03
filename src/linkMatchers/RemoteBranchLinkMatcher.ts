import { createReferenceLinkMatcher } from "./createReferenceLinkMatcher"

export const RemoteBranchLinkMatcher = createReferenceLinkMatcher({
  type: "remoteBranch",
  store: "remoteBranches",
})
