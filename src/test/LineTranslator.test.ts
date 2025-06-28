import { deepEqual } from "assert/strict"
import { LineTranslator } from "../LineTranslator"

const deletionDiff = `diff --git a/test b/test
index ac3c48e..af1a584 100644
--- a/test
+++ b/test
@@ -4 +3,0 @@ Pellentesque lacinia sapien nec vehicula dignissim. Cras ut dui sit amet tellus
-luctus luctus et sit amet enim. Nulla tincidunt et velit et ultrices. Aenean`

const additionDiff = `diff --git a/test b/test
index ac3c48e..a0ae540 100644
--- a/test
+++ b/test
@@ -3,0 +4 @@ Pellentesque lacinia sapien nec vehicula dignissim. Cras ut dui sit amet tellus
+Mauris in ante libero. Maecenas scelerisque id augue vitae lacinia.`

const modificationDiff = `diff --git a/test b/test
index ac3c48e..f4bc070 100644
--- a/test
+++ b/test
@@ -4,2 +4,3 @@ Pellentesque lacinia sapien nec vehicula dignissim. Cras ut dui sit amet tellus
-luctus luctus et sit amet enim. Nulla tincidunt et velit et ultrices. Aenean
-eget est sagittis, varius purus sit amet, vestibulum libero. Cras sed eros non
+Mauris in ante libero. Maecenas scelerisque id augue vitae lacinia. Nulla facilisi.
+Suspendisse luctus sit amet metus non molestie. Vestibulum semper, dui a mollis
+mattis, nunc mauris vulputate risus, lacinia lacinia quam felis vel est.`

suite("LineTranslator", () => {
  const dt = LineTranslator(deletionDiff)

  test("before deletion", () => {
    deepEqual(dt.newSpan(2), { start: 2, end: 2, lines: 1 })
    deepEqual(dt.oldSpan(2), { start: 2, end: 2, lines: 1 })
  })

  test("after deletion", () => {
    deepEqual(dt.newSpan(5), { start: 4, end: 4, lines: 1 })
    deepEqual(dt.oldSpan(4), { start: 5, end: 5, lines: 1 })
  })

  test("inside deletion", () => {
    deepEqual(dt.newSpan(4), { start: 3, end: 3, lines: 0 })
  })

  const at = LineTranslator(additionDiff)

  test("before addition", () => {
    deepEqual(at.newSpan(2), { start: 2, end: 2, lines: 1 })
    deepEqual(at.oldSpan(2), { start: 2, end: 2, lines: 1 })
  })

  test("after addition", () => {
    deepEqual(at.newSpan(5), { start: 6, end: 6, lines: 1 })
    deepEqual(at.oldSpan(6), { start: 5, end: 5, lines: 1 })
  })

  test("inside addition", () => {
    deepEqual(at.oldSpan(4), { start: 3, end: 3, lines: 0 })
  })

  const mt = LineTranslator(modificationDiff)

  test("inside modification (deletion and addition)", () => {
    deepEqual(mt.newSpan(4), { start: 4, end: 6, lines: 3 })
    deepEqual(mt.oldSpan(5), { start: 4, end: 5, lines: 2 })
  })
})
