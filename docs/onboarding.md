# Onboarding

This guide explains how a new project can use the reusable GitHub Actions platform in `s5micheldevops/platform-reusable-workflows`.

## What This Repository Provides

This repository provides shared GitHub Actions automation for many repositories.

Current reusable workflows:

- `reusable-gitleaks.yml` for secret scanning.
- `reusable-branch-naming.yml` for branch naming governance.
- `reusable-static-site-quality.yml` for plain static website checks.

Current composite actions:

- `actions/gitleaks-scan`
- `actions/validate-branch-name`
- `actions/static-site-quality`

## Key Concepts

| Concept | Lives In | Purpose |
| --- | --- | --- |
| Composite action | `platform-reusable-workflows/actions/` | A reusable group of steps. It is usually called by a workflow. |
| Reusable workflow | `platform-reusable-workflows/.github/workflows/` | A full reusable job or pipeline that application repositories can call. |
| Caller workflow | Application repository `.github/workflows/` | A small workflow file that decides when to run and calls the reusable workflow. |

Beginner explanation:

- The application repository owns the code.
- The caller workflow is the small file copied into that application repository.
- The reusable workflow lives in this platform repository.
- The composite action is the lower-level implementation used by the reusable workflow.

Reusable workflows must be called with `jobs.<job_id>.uses`, not inside normal `steps`.

Correct:

```yaml
jobs:
  quality:
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-static-site-quality.yml@v0.1.0
```

Incorrect:

```yaml
steps:
  - uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-static-site-quality.yml@v0.1.0
```

## Where Caller Workflows Go

In every application repository, caller workflow files go here:

```text
.github/workflows/
```

Recommended starter files:

- `security-gitleaks.yml`
- `enforce-branch-naming.yml`
- `frontend-quality.yml`

Every starter workflow should use minimal permissions:

```yaml
permissions:
  contents: read
```

## Version Pinning Best Practices

`@main` tracks the latest code and can change anytime. This is useful for development and testing, but risky for production repositories.

`@v0.1.0` points to a stable snapshot. Production repositories should prefer `@v0.1.0` or future version tags.

Production:

```yaml
uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-static-site-quality.yml@v0.1.0
```

Development/testing:

```yaml
uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-static-site-quality.yml@main
```

When a new stable version is ready:

```bash
git tag v0.2.0
git push origin v0.2.0
```

## Starter Workflow 1: Gitleaks Secret Scanning

Create this file in the application repository:

```text
.github/workflows/security-gitleaks.yml
```

```yaml
name: Security - Gitleaks

on:
  push:
    branches:
      - "**"
  pull_request:

permissions:
  contents: read

jobs:
  gitleaks:
    name: Call reusable Gitleaks workflow
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-gitleaks.yml@v0.1.0
    with:
      fetch_depth: 0
      fail_on_error: true
      redact: true
```

Gitleaks scans for accidental secrets such as API keys, tokens, private keys, passwords, and cloud credentials. If it fails, rotate the exposed secret. Do not only delete it from code.

## Starter Workflow 2: Branch Naming Governance

Create this file in the application repository:

```text
.github/workflows/enforce-branch-naming.yml
```

```yaml
name: Governance - Branch Naming

on:
  push:
    branches:
      - "**"
  pull_request:

permissions:
  contents: read

jobs:
  branch-naming:
    name: Call reusable branch naming workflow
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-branch-naming.yml@v0.1.0
```

Default valid examples:

- `feature/add-login-page`
- `docs/update-readme`
- `hotfix/fix-api-timeout`
- `ci/add-security-scan`
- `design/update-hero-layout`

Bad examples:

- `test123`
- `jean-work`
- `random`
- `mybranch`
- `feature/add login`

Branch naming standards help CI/CD governance because branch names can influence review routing, deployment rules, release handling, and audit trails.

## Starter Workflow 3: Static Site Quality

Create this file in the application repository:

```text
.github/workflows/frontend-quality.yml
```

```yaml
name: Quality - Static Site

on:
  push:
    branches:
      - "**"
  pull_request:

permissions:
  contents: read

jobs:
  static-site-quality:
    name: Call reusable static site quality workflow
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-static-site-quality.yml@v0.1.0
```

Static site quality checks currently:

- Verify root `index.html` exists.
- Detect Git conflict markers.
- Detect obvious secret-like strings without printing values.
- Warn if `assets/` is missing.
- Warn about files larger than 5 MB.

## Step-By-Step Onboarding For A New Static Site

1. Open the application repository.
2. Create `.github/workflows/`.
3. Add `security-gitleaks.yml`.
4. Add `enforce-branch-naming.yml`.
5. Add `frontend-quality.yml`.
6. Use `@v0.1.0` for production stability.
7. Commit the caller workflow files.
8. Push the branch.
9. Open GitHub Actions and verify the workflows appear.
10. Fix any issues reported by the checks.

## Step-By-Step Onboarding For M5 Soft Website

1. Open the `m5soft-website` repository.
2. Confirm `.github/workflows/security-gitleaks.yml` exists.
3. Confirm `.github/workflows/enforce-branch-naming.yml` exists.
4. Add `.github/workflows/frontend-quality.yml` from the static site starter.
5. Prefer `@v0.1.0` once the platform tag is available in GitHub.
6. Push and verify all three workflows run.

## Step-By-Step Onboarding For Sawa Convention Website

1. Open the Sawa Convention website repository.
2. Create `.github/workflows/` if it does not exist.
3. Add `security-gitleaks.yml`.
4. Add `enforce-branch-naming.yml`.
5. Add `frontend-quality.yml`.
6. Confirm the repository has a root `index.html` if it is a static site.
7. Push and verify GitHub Actions runs the checks.

## Troubleshooting

### Workflow Not Appearing In GitHub Actions

Check that:

- The workflow file is under `.github/workflows/`.
- The file was committed and pushed.
- The file extension is `.yml` or `.yaml`.
- The `on:` trigger matches the event you expect.

### Reusable Workflow Cannot Be Found

Check that:

- The repository path is `s5micheldevops/platform-reusable-workflows`.
- The workflow file path is correct.
- The referenced tag exists, for example `@v0.1.0`.
- If using `@main`, the workflow has been pushed to the `main` branch.

### Branch Naming Workflow Failed

Rename the branch to match the platform standard.

Good examples:

- `feature/add-service-card`
- `design/update-hero-layout`
- `ci/add-security-scan`
- `docs/update-maintenance-guide`
- `hotfix/fix-contact-email`

### Gitleaks Detected A Secret

Treat it seriously:

1. Confirm whether the finding is a real secret.
2. Rotate or revoke the exposed secret.
3. Remove it from code.
4. Check Git history and logs.
5. Rerun the workflow.

Do not paste secret values into tickets, chat, commits, or pull request comments.

### Static Site Quality Failed Because `index.html` Is Missing

The current static site workflow expects `index.html` at the repository root. Add it there or wait for a future workflow version that supports custom site paths.

### Conflict Markers Were Detected

Open the listed files and remove unresolved merge markers:

```text
<<<<<<<
=======
>>>>>>>
```

Choose the correct final code before committing.

### Large Files Warning Appears

This is currently a warning, not a failure. Review the listed files and consider compressing images, removing generated files, or using a better asset strategy.

### Node.js 20 Deprecation Warning From `actions/checkout@v4`

This warning is not currently a workflow failure. It means GitHub is warning about the runtime lifecycle for an action. The platform repository should update action versions in a future release when needed.

## Maintenance Expectations

- Keep caller workflows small.
- Keep reusable workflow references version-pinned in production.
- Avoid copying central workflow logic into application repositories.
- Update this guide when new platform workflows are added.
