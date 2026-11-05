// Direct Push Guard — push classification (pure, deterministic, unit-testable).
//
// This module never performs I/O for classification: the reusable workflow
// gathers the push metadata and the per-commit pull-request evidence from the
// GitHub API, then hands a plain object to `classify()`. Keeping the logic pure
// lets the test suite feed mocked GitHub responses with no network access.
//
// IMPORTANT: GitHub Actions runs AFTER a push is accepted. This is a detective
// control, not branch protection. The GitHub actor alone is NEVER treated as
// proof of authorization — only merged-PR evidence (or an explicitly configured
// exception) is.

/**
 * @typedef {Object} PullEvidence
 * @property {number} number
 * @property {string} state      "open" | "closed"
 * @property {boolean} merged    true when the PR is merged
 * @property {string} baseRef    the PR base branch
 * @property {string} [mergeCommitSha] the PR's merge_commit_sha (merge/squash/rebase result)
 *
 * @typedef {Object} CommitEvidence
 * @property {string} sha
 * @property {PullEvidence[]} pulls   PRs associated with this commit
 *
 * @typedef {Object} ClassifyInput
 * @property {string} branch                 pushed branch (github.ref_name)
 * @property {string} [headSha]              pushed HEAD commit (github.sha / after)
 * @property {string[]} operationalBranches  branches to audit (e.g. ["main","staging"])
 * @property {"strict"|"audit"} mode
 * @property {boolean} created               branch-creation push
 * @property {boolean} deleted               branch-deletion push
 * @property {boolean} forced                force push
 * @property {CommitEvidence[]} commits      full pushed range (or as much as inspected)
 * @property {boolean} rangeComplete         false if the commit range was truncated
 * @property {boolean} prLookupComplete      false if any PR lookup failed (perms/rate limit)
 * @property {string} [actor]                github.actor (pusher) — NOT proof of authorization
 * @property {string[]} [allowedActors]      documented exceptions
 */

export const CLASSIFICATION = {
  NOT_APPLICABLE: "NOT_APPLICABLE",
  SKIPPED_DELETION: "SKIPPED_DELETION",
  EXCEPTION_ALLOWED: "EXCEPTION_ALLOWED",
  AUTHORIZED_PR_MERGE: "AUTHORIZED_PR_MERGE",
  DIRECT_PUSH: "DIRECT_PUSH",
  FORCE_PUSH: "FORCE_PUSH",
  MIXED: "MIXED",
  AMBIGUOUS: "AMBIGUOUS",
  BRANCH_CREATED: "BRANCH_CREATED",
};

const VIOLATIONS = new Set([
  CLASSIFICATION.DIRECT_PUSH,
  CLASSIFICATION.FORCE_PUSH,
  CLASSIFICATION.MIXED,
]);

// Inconclusive outcomes: fail-closed in strict mode, non-blocking in audit mode.
const INCONCLUSIVE = new Set([
  CLASSIFICATION.AMBIGUOUS,
  CLASSIFICATION.BRANCH_CREATED,
]);

function isMergedInto(pull, branch) {
  return Boolean(pull && pull.merged === true && pull.baseRef === branch);
}

/**
 * @param {ClassifyInput} input
 * @returns {{classification:string, reason:string, result:"pass"|"fail"|"neutral", attribution?:object}}
 */
export function classify(input) {
  const mode = input.mode === "strict" ? "strict" : "audit";
  const branch = input.branch;
  const operational = Array.isArray(input.operationalBranches) ? input.operationalBranches : [];

  const decide = (classification, reason, attribution) => {
    let result = "neutral";
    if (classification === CLASSIFICATION.AUTHORIZED_PR_MERGE) result = "pass";
    else if (VIOLATIONS.has(classification)) result = mode === "strict" ? "fail" : "neutral";
    else if (INCONCLUSIVE.has(classification)) result = mode === "strict" ? "fail" : "neutral";
    return { classification, reason, result, ...(attribution ? { attribution } : {}) };
  };

  // 0. Deletions carry no tree to audit.
  if (input.deleted) return decide(CLASSIFICATION.SKIPPED_DELETION, "Branch deletion event; nothing to audit.");

  // 1. Only audit configured operational branches.
  if (!operational.includes(branch))
    return decide(CLASSIFICATION.NOT_APPLICABLE, `Branch '${branch}' is not in the operational set [${operational.join(", ")}].`);

  // 2. Documented exception (explicit allow-list), reported but non-blocking.
  if (Array.isArray(input.allowedActors) && input.actor && input.allowedActors.includes(input.actor))
    return decide(CLASSIFICATION.EXCEPTION_ALLOWED, `Actor '${input.actor}' is in the documented exception list.`);

  // 3. Force push: a violation unless an exception applied above.
  if (input.forced) return decide(CLASSIFICATION.FORCE_PUSH, "Force push detected on an operational branch.");

  // 4. Incomplete evidence must never be reported as authorized.
  if (input.rangeComplete === false)
    return decide(CLASSIFICATION.AMBIGUOUS, "Pushed commit range is truncated/incomplete; cannot verify every commit.");
  if (input.prLookupComplete === false)
    return decide(CLASSIFICATION.AMBIGUOUS, "At least one pull-request association lookup failed (permissions or rate limit).");

  // 5. Branch creation of an operational branch is unusual; classify explicitly.
  if (input.created) return decide(CLASSIFICATION.BRANCH_CREATED, "Operational branch was just created; no merge context to verify.");

  const commits = Array.isArray(input.commits) ? input.commits : [];
  if (commits.length === 0)
    return decide(CLASSIFICATION.AMBIGUOUS, "No commits available to evaluate.");

  // 6. Per-commit attribution to a PR merged INTO this branch.
  const attributed = [];
  const unattributed = [];
  for (const c of commits) {
    const pulls = Array.isArray(c.pulls) ? c.pulls : [];
    (pulls.some((p) => isMergedInto(p, branch)) ? attributed : unattributed).push(c.sha);
  }
  const attribution = { total: commits.length, attributed: attributed.length, unattributed: unattributed.length, unattributedShas: unattributed };

  if (unattributed.length === 0) {
    // Reliability guard: a commit being ASSOCIATED with a merged PR does not by
    // itself prove THIS push was a fresh authorized merge (e.g. a direct re-push
    // of commits that belonged to an already-merged PR). Require the pushed HEAD
    // to equal the merge_commit_sha of a PR merged into this branch — which it
    // is for merge-commit, squash and rebase merges at merge time.
    const mergeShas = new Set();
    for (const c of commits)
      for (const p of Array.isArray(c.pulls) ? c.pulls : [])
        if (isMergedInto(p, branch) && p.mergeCommitSha) mergeShas.add(p.mergeCommitSha);
    if (input.headSha && mergeShas.has(input.headSha))
      return decide(CLASSIFICATION.AUTHORIZED_PR_MERGE, "Every pushed commit maps to a merged PR and the pushed HEAD is that PR's merge commit.", attribution);
    return decide(CLASSIFICATION.AMBIGUOUS, "All pushed commits map to merged PRs, but the pushed HEAD is not a recorded PR merge commit (possible replay/direct push of already-merged commits).", attribution);
  }
  if (attributed.length === 0)
    return decide(CLASSIFICATION.DIRECT_PUSH, "No pushed commit is attributable to a merged PR into this branch.", attribution);
  return decide(CLASSIFICATION.MIXED, "Some pushed commits are not attributable to a merged PR into this branch.", attribution);
}

// --- CLI wrapper: `node classify-push.mjs <input.json>` -> prints JSON, exit 1 on "fail".
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  const raw = file ? readFileSync(file, "utf8") : readFileSync(0, "utf8");
  const out = classify(JSON.parse(raw));
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(out.result === "fail" ? 1 : 0);
}
