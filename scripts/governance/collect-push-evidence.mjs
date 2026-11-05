// Direct Push Guard — evidence collector (performs I/O, delegates ALL decisions
// to the pure, unit-tested classify() in classify-push.mjs).
//
// Runs inside the composite action. Reads the push metadata from the GitHub
// Actions environment, queries the GitHub REST API for the pushed commit range
// and each commit's associated pull requests, builds the classifier input, and
// writes a job summary. Exits non-zero only when classify() returns "fail"
// (strict mode on a confirmed/inconclusive violation).
//
// It never trusts the actor as proof of authorization and never classifies an
// incomplete inspection (API error, truncated range) as authorized.
import { classify } from "./classify-push.mjs";
import { appendFileSync } from "node:fs";

const env = process.env;
const repo = env.GITHUB_REPOSITORY;
const token = env.GH_TOKEN || env.GITHUB_TOKEN || "";
const branch = env.DPG_BRANCH || "";
const before = env.DPG_BEFORE || "";
const after = env.DPG_AFTER || env.GITHUB_SHA || "";
const created = env.DPG_CREATED === "true";
const deleted = env.DPG_DELETED === "true";
const forced = env.DPG_FORCED === "true";
const actor = env.DPG_ACTOR || "";
const operationalBranches = (env.DPG_OPERATIONAL || "main staging").split(/\s+/).filter(Boolean);
const mode = env.DPG_MODE === "strict" ? "strict" : "audit";
const allowedActors = (env.DPG_ALLOWED_ACTORS || "").split(/\s+/).filter(Boolean);
const maxCommits = Number.parseInt(env.DPG_MAX_COMMITS || "250", 10);

async function api(path) {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

let rangeComplete = true;
let prLookupComplete = true;
let commits = [];

if (!deleted && !created && operationalBranches.includes(branch)) {
  try {
    const cmp = await api(`repos/${repo}/compare/${before}...${after}?per_page=250`);
    const shas = (cmp.commits || []).map((c) => c.sha);
    if ((cmp.total_commits ?? shas.length) > shas.length) rangeComplete = false; // compare API caps at 250
    if (shas.length > maxCommits) rangeComplete = false;
    for (const sha of shas.slice(0, maxCommits)) {
      try {
        const pulls = await api(`repos/${repo}/commits/${sha}/pulls?per_page=100`);
        commits.push({
          sha,
          pulls: (pulls || []).map((p) => ({
            number: p.number,
            state: p.state,
            merged: p.merged_at != null,
            baseRef: p.base?.ref,
          })),
        });
      } catch {
        prLookupComplete = false; // do NOT assume authorized on a failed lookup
        commits.push({ sha, pulls: [] });
      }
    }
  } catch {
    prLookupComplete = false; // compare failed (permissions / rate limit / bad range)
  }
}

const result = classify({
  branch, operationalBranches, mode, created, deleted, forced, actor, allowedActors,
  rangeComplete, prLookupComplete, commits,
});

const lines = [
  "## Direct Push Guard",
  "",
  "| Field | Value |",
  "| --- | --- |",
  `| Repository | \`${repo}\` |`,
  `| Branch | \`${branch}\` |`,
  `| Actor (pusher) | \`${actor}\` |`,
  `| Before → After | \`${before.slice(0, 9)}\` → \`${after.slice(0, 9)}\` |`,
  `| Force-push | \`${forced}\` |`,
  `| Commits inspected | \`${commits.length}\` (range complete: \`${rangeComplete}\`, PR lookups complete: \`${prLookupComplete}\`) |`,
  `| Mode | \`${mode}\` |`,
  `| Classification | **${result.classification}** |`,
  `| Reason | ${result.reason} |`,
  `| Result | **${result.result}** |`,
  "",
  "_Detective control: this job runs AFTER the push was accepted by GitHub. It cannot reject a push or stop Vercel from deploying the commit._",
];
if (env.GITHUB_STEP_SUMMARY) {
  try { appendFileSync(env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n"); } catch { /* summary is best-effort */ }
}
process.stdout.write(JSON.stringify(result) + "\n");

if (result.result === "fail") {
  process.stderr.write(`::error::Direct Push Guard: ${result.classification} on ${branch} — ${result.reason}\n`);
  process.exit(1);
}
