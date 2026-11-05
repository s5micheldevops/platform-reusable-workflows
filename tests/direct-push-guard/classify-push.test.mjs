// Deterministic unit tests for the Direct Push Guard classifier.
// Run with: node --test tests/direct-push-guard/
// No network: every GitHub API response is mocked inline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, CLASSIFICATION } from "../../scripts/governance/classify-push.mjs";

const base = {
  branch: "main",
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
const mergedPR = (n) => ({ number: n, state: "closed", merged: true, baseRef: "main" });
const openPR = (n) => ({ number: n, state: "open", merged: false, baseRef: "main" });
const commit = (sha, pulls = []) => ({ sha, pulls });

// 1. Normal PR merge commit -> AUTHORIZED, pass.
test("1 normal PR merge commit", () => {
  const r = classify({ ...base, commits: [commit("a1", [mergedPR(10)])] });
  assert.equal(r.classification, CLASSIFICATION.AUTHORIZED_PR_MERGE);
  assert.equal(r.result, "pass");
});

// 2. Squash merge (single squashed commit associated with the merged PR).
test("2 squash merge", () => {
  const r = classify({ ...base, commits: [commit("sq1", [mergedPR(11)])] });
  assert.equal(r.classification, CLASSIFICATION.AUTHORIZED_PR_MERGE);
  assert.equal(r.result, "pass");
});

// 3. Rebase merge (each replayed commit is associated with the merged PR).
test("3 rebase merge", () => {
  const r = classify({ ...base, commits: [commit("rb1", [mergedPR(12)]), commit("rb2", [mergedPR(12)])] });
  assert.equal(r.classification, CLASSIFICATION.AUTHORIZED_PR_MERGE);
  assert.equal(r.result, "pass");
});

// 4. Confirmed direct push (no associated PR).
test("4 confirmed direct push", () => {
  const r = classify({ ...base, commits: [commit("d1", [])] });
  assert.equal(r.classification, CLASSIFICATION.DIRECT_PUSH);
  assert.equal(r.result, "fail"); // strict
});

// 5. Force push -> violation regardless of commits.
test("5 force push", () => {
  const r = classify({ ...base, forced: true, commits: [commit("f1", [mergedPR(13)])] });
  assert.equal(r.classification, CLASSIFICATION.FORCE_PUSH);
  assert.equal(r.result, "fail");
});

// 6. Multi-commit direct push (none attributed).
test("6 multi-commit direct push", () => {
  const r = classify({ ...base, commits: [commit("m1", []), commit("m2", []), commit("m3", [])] });
  assert.equal(r.classification, CLASSIFICATION.DIRECT_PUSH);
  assert.equal(r.result, "fail");
});

// 7. Multi-commit PR merge (all attributed).
test("7 multi-commit PR merge", () => {
  const r = classify({ ...base, commits: [commit("p1", [mergedPR(20)]), commit("p2", [mergedPR(20)])] });
  assert.equal(r.classification, CLASSIFICATION.AUTHORIZED_PR_MERGE);
  assert.equal(r.result, "pass");
});

// 8. Mixed authorized + unauthorized commits -> MIXED, not AUTHORIZED.
test("8 mixed commits", () => {
  const r = classify({ ...base, commits: [commit("x1", [mergedPR(21)]), commit("x2", [])] });
  assert.equal(r.classification, CLASSIFICATION.MIXED);
  assert.equal(r.result, "fail"); // strict
});

// 9. Missing API permissions -> AMBIGUOUS, fail-closed in strict.
test("9 missing API permissions", () => {
  const r = classify({ ...base, prLookupComplete: false, commits: [commit("q1", [])] });
  assert.equal(r.classification, CLASSIFICATION.AMBIGUOUS);
  assert.equal(r.result, "fail");
});

// 10. Missing / ambiguous PR association (open PR only, not merged) -> DIRECT_PUSH evidence absent.
test("10 open PR only is not a merge", () => {
  const r = classify({ ...base, commits: [commit("o1", [openPR(22)])] });
  assert.equal(r.classification, CLASSIFICATION.DIRECT_PUSH);
  assert.equal(r.result, "fail");
});

// 11. Branch creation -> explicit BRANCH_CREATED (inconclusive).
test("11 branch creation", () => {
  const r = classify({ ...base, created: true, commits: [commit("c1", [])] });
  assert.equal(r.classification, CLASSIFICATION.BRANCH_CREATED);
  assert.equal(r.result, "fail"); // strict fail-closed
});

// 12. Truncated commit range -> AMBIGUOUS, never AUTHORIZED.
test("12 truncated range", () => {
  const r = classify({ ...base, rangeComplete: false, commits: [commit("t1", [mergedPR(23)])] });
  assert.equal(r.classification, CLASSIFICATION.AMBIGUOUS);
  assert.equal(r.result, "fail");
});

// 13. API rate limiting modeled as an incomplete PR lookup -> AMBIGUOUS.
test("13 rate limiting", () => {
  const r = classify({ ...base, prLookupComplete: false, commits: [commit("rl1", [mergedPR(24)])] });
  assert.equal(r.classification, CLASSIFICATION.AMBIGUOUS);
  assert.equal(r.result, "fail");
});

// 14. Strict vs audit mode: same inconclusive input, different result.
test("14 strict vs audit mode", () => {
  const strict = classify({ ...base, mode: "strict", commits: [commit("s1", [])] });
  const audit = classify({ ...base, mode: "audit", commits: [commit("s1", [])] });
  assert.equal(strict.result, "fail");
  assert.equal(audit.result, "neutral");
  assert.equal(audit.classification, CLASSIFICATION.DIRECT_PUSH); // same classification, non-blocking
});

// Extra: non-operational branch and deletion are neutral; documented exception is neutral.
test("extra non-operational branch", () => {
  const r = classify({ ...base, branch: "feature/x", commits: [commit("n1", [])] });
  assert.equal(r.classification, CLASSIFICATION.NOT_APPLICABLE);
  assert.equal(r.result, "neutral");
});
test("extra documented exception actor", () => {
  const r = classify({ ...base, actor: "release-bot", allowedActors: ["release-bot"], commits: [commit("e1", [])] });
  assert.equal(r.classification, CLASSIFICATION.EXCEPTION_ALLOWED);
  assert.equal(r.result, "neutral");
});
test("extra deletion skipped", () => {
  const r = classify({ ...base, deleted: true });
  assert.equal(r.classification, CLASSIFICATION.SKIPPED_DELETION);
  assert.equal(r.result, "neutral");
});
