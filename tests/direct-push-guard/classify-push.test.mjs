// Deterministic unit tests for the Direct Push Guard classifier.
// Run with: node --test tests/direct-push-guard/
// No network: every GitHub API response is mocked inline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, CLASSIFICATION } from "../../scripts/governance/classify-push.mjs";

const base = {
  branch: "main",
  headSha: "HEAD",
  operationalBranches: ["main", "staging"],
  mode: "strict",
  created: false,
  deleted: false,
  forced: false,
  rangeComplete: true,
  prLookupComplete: true,
  actor: "someone",
  allowedActors: [],
  commits: [],
};
// A merged PR carries its merge_commit_sha (the base-branch result of the merge).
const mergedPR = (n, mergeCommitSha) => ({ number: n, state: "closed", merged: true, baseRef: "main", mergeCommitSha });
const openPR = (n) => ({ number: n, state: "open", merged: false, baseRef: "main", mergeCommitSha: null });
const commit = (sha, pulls = []) => ({ sha, pulls });

// 1. Normal PR merge commit -> AUTHORIZED (head == merge_commit_sha).
test("1 normal PR merge commit", () => {
  const r = classify({ ...base, headSha: "a1", commits: [commit("a1", [mergedPR(10, "a1")])] });
  assert.equal(r.classification, CLASSIFICATION.AUTHORIZED_PR_MERGE);
  assert.equal(r.result, "pass");
});

// 2. Squash merge (single squash commit == merge_commit_sha).
test("2 squash merge", () => {
  const r = classify({ ...base, headSha: "sq1", commits: [commit("sq1", [mergedPR(11, "sq1")])] });
  assert.equal(r.classification, CLASSIFICATION.AUTHORIZED_PR_MERGE);
  assert.equal(r.result, "pass");
});

// 3. Rebase merge (top rebased commit == merge_commit_sha).
test("3 rebase merge", () => {
  const r = classify({ ...base, headSha: "rb2", commits: [commit("rb1", [mergedPR(12, "rb2")]), commit("rb2", [mergedPR(12, "rb2")])] });
  assert.equal(r.classification, CLASSIFICATION.AUTHORIZED_PR_MERGE);
  assert.equal(r.result, "pass");
});

// 4. Confirmed direct push (no associated PR).
test("4 confirmed direct push", () => {
  const r = classify({ ...base, headSha: "d1", commits: [commit("d1", [])] });
  assert.equal(r.classification, CLASSIFICATION.DIRECT_PUSH);
  assert.equal(r.result, "fail");
});

// 5. Force push -> violation regardless of commits.
test("5 force push", () => {
  const r = classify({ ...base, forced: true, headSha: "f1", commits: [commit("f1", [mergedPR(13, "f1")])] });
  assert.equal(r.classification, CLASSIFICATION.FORCE_PUSH);
  assert.equal(r.result, "fail");
});

// 6. Multi-commit direct push (none attributed).
test("6 multi-commit direct push", () => {
  const r = classify({ ...base, headSha: "m3", commits: [commit("m1", []), commit("m2", []), commit("m3", [])] });
  assert.equal(r.classification, CLASSIFICATION.DIRECT_PUSH);
  assert.equal(r.result, "fail");
});

// 7. Multi-commit PR merge (all attributed, head == merge_commit_sha).
test("7 multi-commit PR merge", () => {
  const r = classify({ ...base, headSha: "p2", commits: [commit("p1", [mergedPR(20, "p2")]), commit("p2", [mergedPR(20, "p2")])] });
  assert.equal(r.classification, CLASSIFICATION.AUTHORIZED_PR_MERGE);
  assert.equal(r.result, "pass");
});

// 8. Mixed authorized + unauthorized commits -> MIXED.
test("8 mixed commits", () => {
  const r = classify({ ...base, headSha: "x2", commits: [commit("x1", [mergedPR(21, "x2")]), commit("x2", [])] });
  assert.equal(r.classification, CLASSIFICATION.MIXED);
  assert.equal(r.result, "fail");
});

// 9. Missing API permissions -> AMBIGUOUS, fail-closed in strict.
test("9 missing API permissions", () => {
  const r = classify({ ...base, prLookupComplete: false, commits: [commit("q1", [])] });
  assert.equal(r.classification, CLASSIFICATION.AMBIGUOUS);
  assert.equal(r.result, "fail");
});

// 10. Open PR only (not merged) -> no merge evidence -> DIRECT_PUSH.
test("10 open PR only is not a merge", () => {
  const r = classify({ ...base, headSha: "o1", commits: [commit("o1", [openPR(22)])] });
  assert.equal(r.classification, CLASSIFICATION.DIRECT_PUSH);
  assert.equal(r.result, "fail");
});

// 11. Branch creation -> explicit BRANCH_CREATED (inconclusive).
test("11 branch creation", () => {
  const r = classify({ ...base, created: true, headSha: "c1", commits: [commit("c1", [])] });
  assert.equal(r.classification, CLASSIFICATION.BRANCH_CREATED);
  assert.equal(r.result, "fail");
});

// 12. Truncated commit range -> AMBIGUOUS, never AUTHORIZED.
test("12 truncated range", () => {
  const r = classify({ ...base, rangeComplete: false, headSha: "t1", commits: [commit("t1", [mergedPR(23, "t1")])] });
  assert.equal(r.classification, CLASSIFICATION.AMBIGUOUS);
  assert.equal(r.result, "fail");
});

// 13. API rate limiting modeled as incomplete PR lookup -> AMBIGUOUS.
test("13 rate limiting", () => {
  const r = classify({ ...base, prLookupComplete: false, headSha: "rl1", commits: [commit("rl1", [mergedPR(24, "rl1")])] });
  assert.equal(r.classification, CLASSIFICATION.AMBIGUOUS);
  assert.equal(r.result, "fail");
});

// 14. Strict vs audit mode: same inconclusive input, different result.
test("14 strict vs audit mode", () => {
  const strict = classify({ ...base, mode: "strict", headSha: "s1", commits: [commit("s1", [])] });
  const audit = classify({ ...base, mode: "audit", headSha: "s1", commits: [commit("s1", [])] });
  assert.equal(strict.result, "fail");
  assert.equal(audit.result, "neutral");
  assert.equal(audit.classification, CLASSIFICATION.DIRECT_PUSH);
});

// 15. REGRESSION (false-negative guard): every commit maps to a merged PR, but
//     the pushed HEAD is NOT that PR's merge commit (e.g. a direct re-push of
//     already-merged commits) -> AMBIGUOUS, not AUTHORIZED.
test("15 regression: merged-PR commits but head is not the merge commit", () => {
  const r = classify({ ...base, headSha: "old1", commits: [commit("old1", [mergedPR(30, "mergeX")])] });
  assert.equal(r.classification, CLASSIFICATION.AMBIGUOUS);
  assert.equal(r.result, "fail"); // strict fail-closed
});

// 16. REGRESSION: merged-PR attribution missing merge_commit_sha evidence -> AMBIGUOUS.
test("16 regression: attributed but no merge_commit_sha evidence", () => {
  const r = classify({ ...base, headSha: "n1", commits: [commit("n1", [mergedPR(31, null)])] });
  assert.equal(r.classification, CLASSIFICATION.AMBIGUOUS);
  assert.equal(r.result, "fail");
});

// Neutral cases: non-operational branch, documented exception, deletion.
test("extra non-operational branch", () => {
  const r = classify({ ...base, branch: "feature/x", headSha: "n1", commits: [commit("n1", [])] });
  assert.equal(r.classification, CLASSIFICATION.NOT_APPLICABLE);
  assert.equal(r.result, "neutral");
});
test("extra documented exception actor", () => {
  const r = classify({ ...base, actor: "release-bot", allowedActors: ["release-bot"], headSha: "e1", commits: [commit("e1", [])] });
  assert.equal(r.classification, CLASSIFICATION.EXCEPTION_ALLOWED);
  assert.equal(r.result, "neutral");
});
test("extra deletion skipped", () => {
  const r = classify({ ...base, deleted: true });
  assert.equal(r.classification, CLASSIFICATION.SKIPPED_DELETION);
  assert.equal(r.result, "neutral");
});
