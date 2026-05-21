# Workflow Catalog

This catalog explains the reusable GitHub Actions workflows provided by `s5micheldevops/platform-reusable-workflows`.

Production repositories should prefer version-pinned references such as `@v0.1.0`. The `@main` reference is useful while testing new workflow changes, but it tracks the latest code and can change at any time.

## Current Reusable Workflows

| Workflow | File | Purpose | Status |
| --- | --- | --- | --- |
| Gitleaks Secret Scan | `.github/workflows/reusable-gitleaks.yml` | Scan repositories for leaked secrets. | Added |
| Branch Naming Validation | `.github/workflows/reusable-branch-naming.yml` | Enforce branch naming standards. | Added |
| Static Site Quality | `.github/workflows/reusable-static-site-quality.yml` | Run basic quality checks for plain static websites. | Added |
| Playwright Smoke Test | `.github/workflows/reusable-playwright-smoke.yml` | Run lightweight browser smoke checks against a deployed website. | Added |

## Composite Actions

| Action | Path | Purpose | Status |
| --- | --- | --- | --- |
| Platform Gitleaks Scan | `actions/gitleaks-scan/action.yml` | Wraps `gitleaks/gitleaks-action@v2`. | Added |
| Validate Branch Name | `actions/validate-branch-name/action.yml` | Validates branch names against default or custom regex rules. | Added |
| Static Site Quality | `actions/static-site-quality/action.yml` | Checks `index.html`, conflict markers, secret-like strings, assets, and large files. | Added |

## Reusable Gitleaks Workflow

### Purpose

`.github/workflows/reusable-gitleaks.yml` runs secret scanning with Gitleaks. It helps catch API keys, tokens, private keys, passwords, and other sensitive values before they spread further.

### When To Use It

Use this workflow on any repository that contains source code, website files, infrastructure files, deployment configuration, or client project files.

### Caller Workflow Filename Suggestion

```text
.github/workflows/security-gitleaks.yml
```

### Required Permissions

```yaml
permissions:
  contents: read
```

### Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `fetch_depth` | number | `0` | Git fetch depth. Use `0` to scan full history. |
| `fail_on_error` | boolean | `true` | Fails the job when Gitleaks detects secrets. |
| `redact` | boolean | `true` | Redacts detected secrets from logs when supported. |

### Production Example Using `@v0.1.0`

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

### Development Example Using `@main`

```yaml
jobs:
  gitleaks:
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-gitleaks.yml@main
    with:
      fetch_depth: 0
      fail_on_error: true
      redact: true
```

Use `@main` only for testing workflow changes before a new stable version tag is created.

### Troubleshooting

| Problem | What To Check |
| --- | --- |
| Reusable workflow cannot be found | Confirm the repository path, workflow filename, and tag exist. Prefer `@v0.1.0` for stable usage. |
| Gitleaks detected a secret | Rotate the secret, remove it from code, review history, and rerun the workflow. Do not paste secret values into tickets or logs. |
| Scan misses older history | Confirm `fetch_depth: 0` is used. |

### Beginner Explanation

The application repository owns a small caller workflow. That caller workflow asks the central platform repository to run the reusable Gitleaks workflow. The reusable workflow checks out the application repository and calls the Gitleaks composite action.

## Reusable Branch Naming Workflow

### Purpose

`.github/workflows/reusable-branch-naming.yml` validates that branch names follow a consistent naming standard.

### When To Use It

Use this workflow on repositories where branch names should be readable and predictable for reviews, automation, release management, and audit trails.

### Caller Workflow Filename Suggestion

```text
.github/workflows/enforce-branch-naming.yml
```

### Required Permissions

```yaml
permissions:
  contents: read
```

### Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `allowed_regex` | string | `""` | Optional custom regex override for allowed branch names. |

### Default Branch Rules

Allowed exact branches:

- `main`
- `master`
- `develop`
- `production`

Allowed prefixes:

- `feature/`
- `bug/`
- `hotfix/`
- `chore/`
- `docs/`
- `ci/`
- `refactor/`
- `design/`
- `release/`

Valid examples:

- `feature/add-service-card`
- `design/update-hero-layout`
- `ci/add-security-scan`
- `docs/update-maintenance-guide`
- `hotfix/fix-contact-email`

Invalid examples:

- `test123`
- `jean-work`
- `random`
- `mybranch`
- `feature/`
- `feature/add login`

### Production Example Using `@v0.1.0`

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

### Development Example Using `@main`

```yaml
jobs:
  branch-naming:
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-branch-naming.yml@main
```

### Override Example

```yaml
jobs:
  branch-naming:
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-branch-naming.yml@v0.1.0
    with:
      allowed_regex: '^(main|develop|feature/[A-Z]+-[0-9]+-[a-z0-9._-]+)$'
```

### Troubleshooting

| Problem | What To Check |
| --- | --- |
| Branch naming workflow failed | Rename the branch using an allowed prefix and readable description. |
| Pull request branch looks different from push branch | The workflow uses `github.head_ref` for pull requests and `github.ref_name` for pushes. |
| Custom regex rejects valid branches | Test the regex carefully and keep it documented in the application repository. |

### Beginner Explanation

A branch name is more than a label. CI/CD systems can use it to decide which checks to run, whether a deployment should be allowed, and how release work should be treated.

## Reusable Static Site Quality Workflow

### Purpose

`.github/workflows/reusable-static-site-quality.yml` runs lightweight checks for plain static websites without Docker or npm.

### When To Use It

Use this workflow for repositories that publish simple HTML/CSS/JavaScript websites.

### Caller Workflow Filename Suggestion

```text
.github/workflows/frontend-quality.yml
```

### Required Permissions

```yaml
permissions:
  contents: read
```

### Inputs

This workflow currently has no inputs.

### Checks Performed

- Confirms `index.html` exists at the repository root.
- Detects Git conflict markers.
- Detects obvious secret-like strings without printing values.
- Warns if `assets/` is missing.
- Lists files larger than 5 MB as warnings.

### Production Example Using `@v0.1.0`

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

### Development Example Using `@main`

```yaml
jobs:
  static-site-quality:
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-static-site-quality.yml@main
```

### Troubleshooting

| Problem | What To Check |
| --- | --- |
| `index.html` is missing | Put the website entry file at the repository root or use a future workflow version that supports custom paths. |
| Conflict markers detected | Resolve the merge conflict and remove `<<<<<<<`, `=======`, and `>>>>>>>` marker lines. |
| Large files warning appears | Review large images, videos, archives, or generated files. This warning does not fail the job yet. |
| `assets/` warning appears | This is not a failure. Some sites use different folders. |

### Beginner Explanation

This workflow is a basic quality gate for static sites. It catches common mistakes before they reach production, while staying simple enough for plain HTML/CSS/JS repositories.

## Reusable Playwright Smoke Test Workflow

### Purpose

`.github/workflows/reusable-playwright-smoke.yml` runs lightweight Playwright checks against a deployed website URL. It opens the site in Chromium, confirms the page loads, verifies that core content renders, and checks important website paths such as Services, Contact, and Privacy when enabled.

### Static Quality Checks vs Browser Smoke Testing

Static site quality checks inspect repository files before deployment. They are fast and useful for catching missing `index.html`, conflict markers, secret-like strings, and oversized files.

Browser smoke testing checks a real deployed page after deployment. It catches problems that file checks cannot see, such as a broken staging URL, JavaScript runtime failures, a browser crash, missing deployed assets, or a missing section after deployment.

### When To Use It

Use this workflow after a staging deployment has completed and the staging URL is reachable. It is recommended for static websites, landing pages, and small frontend sites where a quick browser confidence check is useful before production promotion.

### Caller Workflow Filename Suggestion

```text
.github/workflows/playwright-smoke.yml
```

### Required Permissions

```yaml
permissions:
  contents: read
```

### Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `target_url` | string | Required | Fully qualified URL to test, such as `https://staging.example.com`. |
| `check_privacy_page` | boolean | `true` | Checks that a privacy link exists and that the linked page loads. |
| `check_contact_section` | boolean | `true` | Checks that a contact section or contact link exists. |
| `check_language_toggle` | boolean | `false` | Checks that visible `FR` and `EN` language controls exist. |

### Checks Performed

- Opens `target_url` in Chromium.
- Fails if the page is unreachable or returns a failed HTTP status.
- Confirms the page has a non-empty title.
- Confirms the body renders visible text.
- Confirms a Services section or Services navigation link exists.
- Optionally confirms Privacy, Contact, and FR/EN language toggle elements.
- Fails on JavaScript runtime errors or failed navigation requests detected by Playwright.

### Recommended Staging Usage

Run this workflow after the staging deployment job, not before it. The caller workflow should pass the deployed staging URL through `target_url`.

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy staging site here"

  playwright-smoke:
    needs: deploy-staging
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-playwright-smoke.yml@v0.1.0
    with:
      target_url: https://staging.example.com
      check_privacy_page: true
      check_contact_section: true
      check_language_toggle: false
```

### Production Example Using `@v0.1.0`

```yaml
name: Smoke - Playwright

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  playwright-smoke:
    name: Call reusable Playwright smoke workflow
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-playwright-smoke.yml@v0.1.0
    with:
      target_url: https://staging.example.com
      check_privacy_page: true
      check_contact_section: true
      check_language_toggle: false
```

### Development Example Using `@main`

```yaml
jobs:
  playwright-smoke:
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-playwright-smoke.yml@main
    with:
      target_url: https://staging.example.com
```

Use `@main` only for testing workflow changes before a new stable version tag is created.

### Expected Runtime Cost

This workflow installs Playwright and a Chromium browser on `ubuntu-latest`, then runs a small smoke script. It is heavier than static quality checks but still lightweight for staging validation. Expected runtime is usually a few minutes, depending on GitHub runner speed and browser dependency installation time.

### Current Limits

- No Docker.
- No screenshots or artifacts.
- No visual regression testing.
- No Percy, Chromatic, or external SaaS dependency.
- No full end-to-end user journey coverage.

### Troubleshooting

| Problem | What To Check |
| --- | --- |
| Page unreachable | Confirm the staging deployment completed and `target_url` is publicly reachable from GitHub-hosted runners. |
| Services check failed | Confirm the page has a visible Services section, Services link, or element with an ID containing `services`. |
| Privacy check failed | Confirm the page has a visible privacy link and that the linked page returns a successful HTTP status. |
| Contact check failed | Confirm the page has a visible Contact section, Contact link, or element with an ID containing `contact`. |
| Language toggle check failed | Enable `check_language_toggle` only for sites that visibly show `FR` and `EN` controls. |
| Runtime error detected | Review browser console errors locally and check whether deployed JavaScript assets are loading correctly. |

### Beginner Explanation

Static checks answer: "Do the files look reasonable before deployment?"

Playwright smoke checks answer: "Can a real browser open the deployed staging site and see the most important pieces?"

## Caller Workflow vs Reusable Workflow vs Composite Action

| Layer | Where It Lives | How It Is Used |
| --- | --- | --- |
| Caller workflow | Application repository | Defines triggers and calls a reusable workflow with `jobs.<job_id>.uses`. |
| Reusable workflow | `s5micheldevops/platform-reusable-workflows/.github/workflows/` | Defines shared jobs for many repositories. |
| Composite action | `s5micheldevops/platform-reusable-workflows/actions/` | Reusable steps called from reusable workflows. |

Reusable workflows are called at the job level:

```yaml
jobs:
  quality:
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-static-site-quality.yml@v0.1.0
```

They are not called inside `steps`.

## Planned Future Workflows

| Workflow | Intended File | Purpose | Status |
| --- | --- | --- | --- |
| React App CI | `.github/workflows/react-app-ci.yml` | Install dependencies, lint, test, and build React or Node frontends. | Planned |
| Docker Build | `.github/workflows/docker-build.yml` | Build and optionally publish Docker images. | Planned |
| Terraform Plan | `.github/workflows/terraform-plan.yml` | Run formatting, validation, and plan checks. | Planned |
| Kubernetes Validate | `.github/workflows/kubernetes-validate.yml` | Validate manifests and deployment configuration. | Planned |

## General Troubleshooting

| Problem | Likely Cause | Fix |
| --- | --- | --- |
| Workflow does not appear in GitHub Actions | The caller workflow file is missing, not committed, or not pushed. | Place it under `.github/workflows/`, commit, and push it. |
| Reusable workflow cannot be found | Wrong repository path, file path, or tag. | Use `s5micheldevops/platform-reusable-workflows/.github/workflows/<file>@v0.1.0`. |
| Node.js 20 deprecation warning from `actions/checkout@v4` | GitHub is warning about runtime lifecycle. | This is not currently a workflow failure. Update action versions in a future platform release when needed. |
