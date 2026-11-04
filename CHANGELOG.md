# Changelog

All notable changes to this repository are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/), and this
project publishes semantic version tags (for example `v0.5.0`).

## [0.5.0] - Planned (not yet released)

> This version is prepared on `feature/reusable-security-workflows` (PR #4).
> It has **not** been tagged or released yet. Do not pin `@v0.5.0` until the tag exists.

### Added

- `reusable-dependency-scan.yml` — npm dependency audit run from the lockfile;
  blocks at a configurable severity threshold (`low`/`moderate`/`high`/`critical`).
- `reusable-sast-eslint.yml` — Semgrep Community Edition targeted SAST (ruleset v1,
  Semgrep pinned to `1.176.1`). The filename keeps the historical `eslint` name for
  caller compatibility; the engine is Semgrep CE, not ESLint.
- `reusable-env-file-guard.yml` — blocks tracked `.env` files; allows the documented
  templates `.env.example`, `.env.sample`, `.env.template`.
- Composite actions `actions/dependency-scan`, `actions/sast-javascript-typescript`
  and `actions/environment-file-guard`, each loading its scripts and config via
  `$GITHUB_ACTION_PATH` at the pinned revision.
- `scripts/release/pin-composites.sh` — pins the three security workflows to an
  immutable commit SHA, refusing any SHA whose tree does not contain the matching
  composite action **and** its script or config (workflow/action/scripts coherence).
- Semgrep security ruleset v1 (`security/semgrep/javascript-typescript-security-v1.yml`)
  and SAST test fixtures under `tests/security-workflows/fixtures/`.

### Fixed

- Removed the invalid `job.workflow_repository` / `job.workflow_sha` checkout from the
  three security workflows. These are not properties of the `job` context, so they
  evaluated to empty strings and the platform scripts were never found at runtime. The
  workflows now call their composite action, pinned by an immutable commit SHA.

### Unchanged

- The five existing reusable workflows are **not modified** by this release:
  `reusable-gitleaks.yml`, `reusable-branch-naming.yml`,
  `reusable-static-site-quality.yml`, `reusable-playwright-smoke.yml`,
  `reusable-react-doctor.yml`.

## [0.4.1] - Released

- Last released version (current baseline of `main`), prior to the security workflows.
