# Reusable Direct Push Guard

A **detective / audit** control that reports whether a push to an operational
branch (`main`, `staging`, …) came through a **merged pull request** or looks
like a **direct push** or **force push**.

> ⚠️ **It is not branch protection.** GitHub Actions runs *after* a push has
> already been accepted. This workflow **cannot reject a push** and **cannot
> prevent Vercel from starting a deployment** of the pushed commit. On a GitHub
> **Free private** repository (no branch protection / rulesets), it is the
> compensating audit control, not a preventive one.

## Components

| File | Role |
| --- | --- |
| `.github/workflows/reusable-direct-push-guard.yml` | Reusable workflow (`workflow_call`). |
| `actions/direct-push-guard/action.yml` | Composite action invoked by the reusable workflow. |
| `scripts/governance/collect-push-evidence.mjs` | Gathers push + PR evidence from the GitHub API (I/O). |
| `scripts/governance/classify-push.mjs` | Pure, unit-tested classifier (no I/O). |
| `tests/direct-push-guard/classify-push.test.mjs` | Deterministic unit tests (mocked API). |
| `docs/examples/direct-push-guard.caller.yml` | Example caller for consuming repos (docs only). |

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `operational_branches` | `"main staging"` | Space-separated branches to audit. |
| `mode` | `"audit"` | `audit` = report only (never fails). `strict` = fail on confirmed/inconclusive violations. |
| `allowed_actors` | `""` | Space-separated GitHub logins allowed to push directly (documented exceptions; reported, non-blocking). |
| `max_commits` | `"250"` | Max commits inspected before the pushed range is marked incomplete. |

## Outputs
- A GitHub Actions **job summary** table (repository, branch, actor, before→after, force-push, commits inspected, classification, reason, result).
- JSON on stdout: `{ classification, reason, result, attribution }`.
- Exit code: non-zero only when `result = "fail"` (strict mode).

## Required permissions (least privilege)
```yaml
permissions:
  contents: read
  pull-requests: read
```
No secrets are used beyond the automatic `GITHUB_TOKEN`. The workflow does not
check out or execute code from the pushed commits.

## Caller example
See [`docs/examples/direct-push-guard.caller.yml`](examples/direct-push-guard.caller.yml).
Pin the reusable workflow to a published immutable release (tag/SHA).

## Classification logic

For each pushed commit, the guard asks the GitHub API which pull requests are
associated with it (`GET /repos/{repo}/commits/{sha}/pulls`) and whether any is
**merged into the pushed branch**. The actor/pusher is **never** treated as
proof of authorization.

| Classification | Meaning | `strict` | `audit` |
| --- | --- | --- | --- |
| `AUTHORIZED_PR_MERGE` | Every pushed commit maps to a PR merged into this branch. | pass | pass |
| `DIRECT_PUSH` | No pushed commit maps to a merged PR. | **fail** | neutral |
| `FORCE_PUSH` | Force push detected (event metadata). | **fail** | neutral |
| `MIXED` | Some commits attributed, some not (not assumed authorized). | **fail** | neutral |
| `AMBIGUOUS` | Inconclusive: API error/rate limit, truncated range, no commits. | **fail** (fail-closed) | neutral |
| `BRANCH_CREATED` | Operational branch just created; no merge context. | **fail** (fail-closed) | neutral |
| `EXCEPTION_ALLOWED` | Actor in `allowed_actors`. | neutral | neutral |
| `NOT_APPLICABLE` / `SKIPPED_DELETION` | Non-operational branch / deletion. | neutral | neutral |

**Strict-mode failure policy is fail-closed**: inconclusive events
(`AMBIGUOUS`, `BRANCH_CREATED`) fail rather than being reported as authorized.

## Supported merge strategies
- **Merge commit**, **squash merge**, **rebase merge** — all rely on the
  commit→PR association API. A push is `AUTHORIZED_PR_MERGE` only when **every**
  inspected commit is attributable to a PR merged into the branch; a single
  merged-PR commit does **not** authorize an entire push.

## Multi-commit behavior & GitHub API limitations
- The full pushed range is enumerated via `GET /repos/{repo}/compare/{before}...{after}`.
- The compare API returns at most **250 commits**; larger ranges are marked
  `rangeComplete=false` → `AMBIGUOUS` (never silently authorized).
- Per-commit PR association and rate limiting: any failed lookup sets
  `prLookupComplete=false` → `AMBIGUOUS`.
- The raw `push` event payload `commits[]` is itself capped/truncated by GitHub;
  that is why the guard re-derives the range from the compare API.

## Strict vs audit mode
- Start in **audit** (non-blocking) to observe classifications without failing CI.
- Switch to **strict** once the signal is trusted; strict fails on confirmed
  violations and, fail-closed, on inconclusive events.

## Troubleshooting
| Symptom | Likely cause | Action |
| --- | --- | --- |
| `AMBIGUOUS` (lookup failed) | Missing `pull-requests: read` or rate limiting | Grant the permission; re-run. |
| `AMBIGUOUS` (truncated) | Push range > 250 commits | Expected for very large pushes; review manually. |
| `DIRECT_PUSH` on a legitimate merge | Squash/rebase association not yet indexed | Re-run; verify the PR actually merged into this branch. |
| `BRANCH_CREATED` | Operational branch (re)created | Review manually. |

## Vercel deployment limitation
This control is independent of Vercel. It **cannot** stop Vercel from building
or deploying a pushed commit. Deployment authorization (which Git author/account
Vercel accepts) is a separate concern configured in Vercel, not here.

## GitHub Free private repository limitation
Branch protection and rulesets are unavailable on GitHub Free private repos, so
pushes to `main`/`staging` cannot be blocked at the platform level. This guard
provides **after-the-fact detection and an audit trail** only.
