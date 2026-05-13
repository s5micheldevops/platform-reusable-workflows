# Platform Reusable Workflows

This repository is the central home for reusable GitHub Actions workflows and shared automation patterns used across platform, website, application, infrastructure, and client projects.

The goal is to keep common CI/CD logic in one reliable place instead of copying similar workflow files into every repository.

## Why Centralized Reusable Workflows Exist

Central reusable workflows help teams:

- Standardize CI/CD practices across many repositories.
- Reduce repeated YAML in individual project repositories.
- Apply security and quality improvements once, then reuse them everywhere.
- Make onboarding easier for future projects.
- Keep project repositories focused on project-specific code.

For example, a static website, a React application, and a future Docker service may each need different jobs, but they can still share common patterns such as checkout, dependency setup, linting, build validation, artifact handling, and deployment gates.

## Reusable Workflows vs Composite Actions

GitHub Actions supports two common reuse models: reusable workflows and composite actions.

| Type | Lives In | Called With | Best For |
| --- | --- | --- | --- |
| Reusable workflow | `.github/workflows/*.yml` | `uses: owner/repo/.github/workflows/file.yml@ref` | Whole jobs or pipelines, such as static site CI, React build validation, Docker image build, or Terraform plan. |
| Composite action | `actions/<action-name>/action.yml` | `uses: owner/repo/actions/action-name@ref` | A small group of repeated steps inside a job, such as setting up a tool or generating a standard summary. |

Beginner explanation:

- A reusable workflow is like a complete recipe for a job or pipeline.
- A composite action is like a reusable helper step inside a recipe.

This repository will support both patterns over time, but Phase 0 only creates the foundation.

## How Another Repository Calls A Reusable Workflow

A project repository calls a central reusable workflow from its own `.github/workflows/` folder.

Example project workflow:

```yaml
name: Static Site CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  static-site-ci:
    uses: your-github-org/platform-reusable-workflows/.github/workflows/static-site-ci.yml@main
    with:
      site-path: "."
```

Important:

- `your-github-org` should be replaced with the real GitHub owner or organization.
- `@main` can later be replaced with a version tag such as `@v1` for safer long-term usage.
- The reusable workflow file must exist in `.github/workflows/` in this repository.

## Example: m5soft-website

A future `m5soft-website` repository could call a static site workflow like this:

```yaml
name: Website CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  validate:
    uses: your-github-org/platform-reusable-workflows/.github/workflows/static-site-ci.yml@main
    with:
      site-path: "."
      require-html-validation: true
```

This keeps the website repository small. The website repository only decides when to run CI and which inputs to pass.

## Example: sawa-homepage

A future `sawa-homepage` repository could use the same central static site workflow:

```yaml
name: Homepage CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  validate:
    uses: your-github-org/platform-reusable-workflows/.github/workflows/static-site-ci.yml@main
    with:
      site-path: "."
      require-html-validation: true
```

If `sawa-homepage` later becomes a React or Node project, it could switch to a future React workflow without copying a full CI pipeline into the application repository.

## Planned Repository Areas

| Path | Purpose |
| --- | --- |
| `docs/` | Human-readable documentation for onboarding, workflow selection, branch strategy, and security practices. |
| `examples/` | Example consumer configurations for different project types. |
| `actions/` | Future composite actions shared by workflows. |
| `.github/workflows/` | Future reusable GitHub Actions workflows. |

## Phase 0 Status

Phase 0 creates the repository foundation only. No reusable workflow implementation is included yet.

Future phases should add workflows one at a time, with a focused commit after each phase.
