import { deepStrictEqual } from "assert"
import { LineTranslator } from "../../LineTranslator"

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
    deepStrictEqual(dt.newLine(2), { start: 2, end: 2, span: 1 })
    deepStrictEqual(dt.oldLine(2), { start: 2, end: 2, span: 1 })
  })

  test("after deletion", () => {
    deepStrictEqual(dt.newLine(5), { start: 4, end: 4, span: 1 })
    deepStrictEqual(dt.oldLine(4), { start: 5, end: 5, span: 1 })
  })

  test("inside deletion", () => {
    deepStrictEqual(dt.newLine(4), { start: 3, end: 3, span: 0 })
  })

  const at = LineTranslator(additionDiff)

  test("before addition", () => {
    deepStrictEqual(at.newLine(2), { start: 2, end: 2, span: 1 })
    deepStrictEqual(at.oldLine(2), { start: 2, end: 2, span: 1 })
  })

  test("after addition", () => {
    deepStrictEqual(at.newLine(5), { start: 6, end: 6, span: 1 })
    deepStrictEqual(at.oldLine(6), { start: 5, end: 5, span: 1 })
  })

  test("inside addition", () => {
    deepStrictEqual(at.oldLine(4), { start: 3, end: 3, span: 0 })
  })

  const mt = LineTranslator(modificationDiff)

  test("inside modification (deletion and addition)", () => {
    deepStrictEqual(mt.newLine(4), { start: 4, end: 6, span: 3 })
    deepStrictEqual(mt.oldLine(5), { start: 4, end: 5, span: 2 })
  })
})
