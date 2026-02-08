import { equal } from "assert/strict"
import { resolve } from "path"
import * as vscode from "vscode"
import { uriRevisionPath } from "../util"

const TEST_FILE_PATH = "test_file.txt"
const PREV_COMMIT_ID = "cb0649cdbee5525cbfddb8eab4434741be347d29"
const COMMIT_ID = "7dd94a2af298a9c1f7e038ef38b57ad5dab8e190"

suite("uriRevisionPath for different schemes", () => {
  test("file scheme", () => {
    const uri = vscode.Uri.file(workspacePath(TEST_FILE_PATH))
    const { revision, path } = uriRevisionPath(uri)

    equal(revision, "HEAD")
    equal(path, TEST_FILE_PATH)
  })

  test("git scheme", () => {
    const uri = vscode.Uri.from({
      scheme: "git",
      path: workspacePath(TEST_FILE_PATH),
      query: JSON.stringify({
        path: workspacePath(TEST_FILE_PATH),
        ref: COMMIT_ID,
      }),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, COMMIT_ID)
    equal(path, TEST_FILE_PATH)
  })

  test("scm-history-item scheme", () => {
    const uri = vscode.Uri.from({
      scheme: "scm-history-item",
      path: workspacePath(""),
      query: JSON.stringify({
        repositoryId: "scm0",
        historyItemId: COMMIT_ID,
        historyItemParentId: PREV_COMMIT_ID,
        historyItemDisplayId: "",
      }),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, COMMIT_ID)
    equal(path, "")
  })

  test("scm-history-item scheme", () => {
    const uri = vscode.Uri.from({
      scheme: "scm-history-item",
      path: workspacePath(`${PREV_COMMIT_ID}..${COMMIT_ID}`),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, COMMIT_ID)
    equal(path, "")
  })

  test("review scheme", () => {
    const uri = vscode.Uri.from({
      scheme: "review",
      path: `/commit~7dd94a2a/${workspacePath(TEST_FILE_PATH)}`,
      query: JSON.stringify({
        path: workspacePath(TEST_FILE_PATH),
        commit: COMMIT_ID,
        base: true,
        isOutdated: true,
        rootPath: workspacePath(""),
      }),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, COMMIT_ID)
    equal(path, TEST_FILE_PATH)
  })

  test("pr scheme, base", () => {
    const uri = vscode.Uri.from({
      scheme: "pr",
      path: workspacePath(TEST_FILE_PATH),
      query: JSON.stringify({
        fileName: TEST_FILE_PATH,
        baseCommit: PREV_COMMIT_ID,
        headCommit: COMMIT_ID,
        isBase: false,
        prNumber: 123,
        status: 3,
        remoteName: "origin",
      }),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, COMMIT_ID)
    equal(path, TEST_FILE_PATH)
  })

  test("pr scheme, not base", () => {
    const uri = vscode.Uri.from({
      scheme: "pr",
      path: workspacePath(TEST_FILE_PATH),
      query: JSON.stringify({
        fileName: TEST_FILE_PATH,
        baseCommit: PREV_COMMIT_ID,
        headCommit: COMMIT_ID,
        isBase: true,
        prNumber: 123,
        status: 3,
        remoteName: "origin",
      }),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, PREV_COMMIT_ID)
    equal(path, TEST_FILE_PATH)
  })
})

function workspacePath(relativePath: string) {
  return resolve(`src/test/fixtures/test_workspace/${relativePath}`)
}
