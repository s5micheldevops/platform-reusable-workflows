# Workflow Catalog

This catalog will track reusable workflows as they are added.

Phase 0 creates the catalog, but no reusable workflows are implemented yet.

## Planned Workflows

| Workflow | Intended File | Purpose | Status |
| --- | --- | --- | --- |
| Static Site CI | `.github/workflows/static-site-ci.yml` | Validate simple HTML/CSS/JS websites. | Planned |
| React App CI | `.github/workflows/react-app-ci.yml` | Install dependencies, lint, test, and build React or Node frontends. | Planned |
| Docker Build | `.github/workflows/docker-build.yml` | Build and optionally publish Docker images. | Planned |
| Terraform Plan | `.github/workflows/terraform-plan.yml` | Run formatting, validation, and plan checks. | Planned |
| Kubernetes Validate | `.github/workflows/kubernetes-validate.yml` | Validate manifests and deployment configuration. | Planned |

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
