# Workflow Catalog

This catalog will track reusable workflows as they are added.

Phase 0 creates the catalog, but no reusable workflows are implemented yet.

Phase 1 adds a composite action for Gitleaks secret scanning.

Phase 2 adds a reusable Gitleaks workflow that application repositories can call.

## Planned Workflows

| Workflow | Intended File | Purpose | Status |
| --- | --- | --- | --- |
| Static Site CI | `.github/workflows/static-site-ci.yml` | Validate simple HTML/CSS/JS websites. | Planned |
| React App CI | `.github/workflows/react-app-ci.yml` | Install dependencies, lint, test, and build React or Node frontends. | Planned |
| Docker Build | `.github/workflows/docker-build.yml` | Build and optionally publish Docker images. | Planned |
| Terraform Plan | `.github/workflows/terraform-plan.yml` | Run formatting, validation, and plan checks. | Planned |
| Kubernetes Validate | `.github/workflows/kubernetes-validate.yml` | Validate manifests and deployment configuration. | Planned |
| Gitleaks Secret Scan | `.github/workflows/reusable-gitleaks.yml` | Run Gitleaks secret scanning through the platform composite action. | Added |

## Composite Actions

| Action | Path | Purpose | Status |
| --- | --- | --- | --- |
| Platform Gitleaks Scan | `actions/gitleaks-scan/action.yml` | Run reusable secret scanning for checked-out GitHub repositories. | Added |

## Reusable Gitleaks Workflow

### Purpose

`reusable-gitleaks.yml` provides a central GitHub Actions workflow for secret scanning. Application repositories call this workflow instead of copying Gitleaks setup into every repository.

### When To Use It

Use this workflow for repositories that contain code, configuration, infrastructure files, or deployment manifests where secrets might accidentally be committed.

Good candidates include:

- Static websites.
- React and Node applications.
- Docker projects.
- Terraform repositories.
- Kubernetes configuration repositories.
- Future client repositories.

### How Application Repositories Call It

Application repositories should create a small caller workflow, usually at:

```text
.github/workflows/security-gitleaks.yml
```

The caller workflow uses `jobs.<job_id>.uses` to call the reusable workflow:

```yaml
jobs:
  gitleaks:
    uses: YOUR_GITHUB_USERNAME_OR_ORG/platform-reusable-workflows/.github/workflows/reusable-gitleaks.yml@main
    with:
      fetch_depth: 0
      fail_on_error: true
      redact: true
```

A copy-ready example lives at:

```text
examples/static-site/security-gitleaks.yml
```

### Inputs

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `fetch_depth` | number | `0` | Controls checkout history depth. Use `0` to scan full Git history. |
| `fail_on_error` | boolean | `true` | Fails the job when Gitleaks detects secrets. |
| `redact` | boolean | `true` | Redacts detected secret values from logs when supported. |

### What Happens When Secrets Are Found

When `fail_on_error` is `true`, a detected secret fails the job. A developer should inspect the finding, rotate any real exposed secret, remove the secret from code, and re-run the workflow.

Do not only delete the secret from the latest commit. If it was committed, assume it may still exist in Git history or may already have been copied.

### Why `fetch_depth: 0` Is Recommended

Secret scanning is more useful when it checks full Git history. A shallow checkout may only scan recent files and miss secrets committed earlier.

Use:

```yaml
fetch_depth: 0
```

for serious repository validation.

### Caller Workflow vs Reusable Workflow vs Composite Action

| Layer | Where It Lives | What It Does |
| --- | --- | --- |
| Caller workflow | Application repository | Decides when to run and passes inputs. |
| Reusable workflow | `platform-reusable-workflows/.github/workflows/reusable-gitleaks.yml` | Checks out the caller repository, loads the platform action, and runs the scan. |
| Composite action | `platform-reusable-workflows/actions/gitleaks-scan/action.yml` | Validates inputs and invokes `gitleaks/gitleaks-action@v2`. |

## Workflow Selection Guide

| Project Type | Recommended Future Workflow |
| --- | --- |
| Plain HTML/CSS/JS website | Static Site CI |
| React frontend | React App CI |
| Node service | React App CI or a future Node service CI workflow |
| Containerized app | Docker Build |
| Infrastructure as Code | Terraform Plan |
| Kubernetes manifests | Kubernetes Validate |

## Required Documentation For Every Workflow

Each future workflow should document:

- Workflow purpose.
- Inputs.
- Secrets.
- Permissions.
- Outputs, if any.
- Example consumer usage.
- Supported project types.
- Known limitations.

## Naming Guidelines

Use generic names that describe the capability, not a client or project.

Good examples:

- `static-site-ci.yml`
- `react-app-ci.yml`
- `docker-build.yml`
- `terraform-plan.yml`

Avoid names tied to one website, one client, or one temporary use case.
