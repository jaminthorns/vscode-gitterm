import { createReferenceLinkMatcher } from "./createReferenceLinkMatcher"

export const TagLinkMatcher = createReferenceLinkMatcher({
  type: "tag",
  store: "tags",
})
