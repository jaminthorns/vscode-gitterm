import { equal } from "assert/strict"
import { resolve } from "path"
import * as vscode from "vscode"
import { uriRevisionPath } from "../util"

suite("uriRevisionPath for different schemes", () => {
  test("file scheme", () => {
    const uri = vscode.Uri.file(workspacePath("test_file.txt"))
    const { revision, path } = uriRevisionPath(uri)

    equal(revision, "HEAD")
    equal(path, "test_file.txt")
  })

  test("git scheme", () => {
    const uriPath = workspacePath("test_file.txt")
    const commitId = "7dd94a2af298a9c1f7e038ef38b57ad5dab8e190"

    const uri = vscode.Uri.from({
      scheme: "git",
      path: workspacePath("test_file.txt"),
      query: JSON.stringify({ path: uriPath, ref: commitId }),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, commitId)
    equal(path, "test_file.txt")
  })

  test("scm-history-item scheme (from Source Control Graph)", () => {
    const prevCommitId = "7dd94a2af298a9c1f7e038ef38b57ad5dab8e190"
    const commitId = "7dd94a2af298a9c1f7e038ef38b57ad5dab8e190"

    const uri = vscode.Uri.from({
      scheme: "scm-history-item",
      path: workspacePath(""),
      query: JSON.stringify({
        repositoryId: "scm0",
        historyItemId: commitId,
        historyItemParentId: prevCommitId,
        historyItemDisplayId: "",
      }),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, commitId)
    equal(path, "")
  })

  test("scm-history-item scheme (from Timeline)", () => {
    const prevCommitId = "7dd94a2af298a9c1f7e038ef38b57ad5dab8e190"
    const commitId = "7dd94a2af298a9c1f7e038ef38b57ad5dab8e190"

    const uri = vscode.Uri.from({
      scheme: "scm-history-item",
      path: workspacePath(`${prevCommitId}..${commitId}`),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, commitId)
    equal(path, "")
  })

  test("review scheme (from GitHub Pull Requests)", () => {
    const commitId = "7dd94a2af298a9c1f7e038ef38b57ad5dab8e190"

    const uri = vscode.Uri.from({
      scheme: "review",
      path: `/commit~7dd94a2a/${workspacePath("test_file.txt")}`,
      query: JSON.stringify({
        path: workspacePath("test_file.txt"),
        commit: commitId,
        base: true,
        isOutdated: true,
        rootPath: workspacePath(""),
      }),
    })

    const { revision, path } = uriRevisionPath(uri)

    equal(revision, commitId)
    equal(path, "test_file.txt")
  })
})

function workspacePath(relativePath: string) {
  return resolve(`src/test/fixtures/test_workspace/${relativePath}`)
}
