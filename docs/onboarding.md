# Onboarding

This repository stores reusable GitHub Actions automation for multiple project types.

## Who This Repository Is For

- Platform engineers maintaining shared CI/CD standards.
- Developers adding CI/CD to a project repository.
- Contractors who need a safe starting point.
- Business owners who want to understand why automation is centralized.

## How To Think About This Repository

Individual project repositories should stay simple. They should contain only a small workflow file that calls a shared workflow from this repository.

This repository contains the shared logic.

Project repositories contain the project-specific trigger and inputs.

## Phase-Based Work Rule

Build this repository in small phases:

1. Add one workflow or capability.
2. Document how it is used.
3. Add a consumer example.
4. Commit the phase.
5. Test with one real project before expanding.

## Initial Supported Project Types

Planned project categories include:

- Static websites.
- React and Node applications.
- Docker-based services.
- Terraform infrastructure repositories.
- Kubernetes deployment repositories.

Phase 0 does not implement these workflows yet. It only prepares the repository structure.

## How A Consumer Repository Will Use This Repository

A consumer repository will create a small workflow file under:

```text
.github/workflows/
```

That file will call a reusable workflow from this repository using:

```yaml
jobs:
  ci:
    uses: your-github-org/platform-reusable-workflows/.github/workflows/example.yml@main
```

For governance checks, a consumer repository can call the reusable branch naming workflow:

```yaml
jobs:
  branch-naming:
    uses: s5micheldevops/platform-reusable-workflows/.github/workflows/reusable-branch-naming.yml@main
```

The consumer repository controls when the check runs. The reusable workflow controls how the branch name is detected and validated.

## Maintenance Expectations

- Keep workflow names generic.
- Keep inputs documented.
- Avoid project-specific assumptions.
- Prefer version tags for production usage once workflows stabilize.
- Update docs in the same commit as workflow behavior changes.
