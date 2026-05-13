# Branch Strategy

This repository should use a simple and predictable branch strategy.

Branch naming conventions are team rules for naming Git branches. A branch name should quickly tell people what kind of work is happening and what the work is about.

Beginner example:

```text
feature/add-login-page
```

This says the branch is for a new feature, and the feature is adding a login page.

## Recommended Branches

| Branch | Purpose |
| --- | --- |
| `main` | Stable default branch. Reusable workflows on this branch should be safe for active projects. |
| Feature branches | Short-lived branches for adding or changing one workflow or documentation area. |

## Branch Naming Standard

The default platform standard allows these exact long-lived branches:

- `main`
- `master`
- `develop`
- `production`

It also allows short-lived work branches with these prefixes:

- `feature/`
- `bug/`
- `hotfix/`
- `chore/`
- `docs/`
- `ci/`
- `refactor/`
- `design/`
- `release/`

The expected format is:

```text
<prefix>/<short-readable-description>
```

Examples:

```text
feature/add-computer-support-service
design/hero-section-refresh
ci/add-gitleaks-scan
docs/update-maintenance-guide
hotfix/fix-email-link
```

## Why Teams Standardize Branch Names

Standard branch names help teams:

- Understand work before opening the code.
- Search Git history more easily.
- Route pull requests to the right reviewers.
- Trigger CI/CD rules consistently.
- Keep release and hotfix work separate from normal feature work.

CI/CD pipelines may depend on branch names. For example, a future workflow might run extra checks on `release/` branches or block deployments unless the branch is `main` or `production`.

## Branch Type Differences

| Branch Type | Purpose | Example |
| --- | --- | --- |
| Feature branch | Adds a new capability or user-facing behavior. | `feature/add-login-page` |
| Hotfix branch | Fixes an urgent production issue. | `hotfix/fix-api-timeout` |
| Release branch | Prepares a version for release. | `release/v1.2.0` |
| Chore branch | Handles maintenance that is not a feature. | `chore/update-dependencies` |
| Docs branch | Updates documentation only. | `docs/update-readme` |
| CI branch | Updates automation, pipelines, or workflow files. | `ci/add-gitleaks-scan` |

## Readability Rules

Branch names should be readable because they appear in pull requests, CI logs, deployment history, and Git history.

Avoid spaces and random names. Spaces often break scripts or require escaping. Random names do not explain the purpose of the work.

| Good Branch Name | Why It Is Good |
| --- | --- |
| `feature/add-login-page` | Shows this is feature work and describes the feature. |
| `docs/update-readme` | Shows this is documentation work. |
| `hotfix/fix-api-timeout` | Shows this is an urgent fix and describes the issue. |

| Bad Branch Name | Why It Is Bad |
| --- | --- |
| `test123` | Does not explain the work. |
| `jean-work` | Tied to a person, not the purpose. |
| `random` | Gives reviewers no useful context. |
| `mybranch` | Too vague for automation or collaboration. |

## Validate Branch Name Composite Action

Phase 3 adds a reusable composite action at:

```text
actions/validate-branch-name/action.yml
```

The action validates a branch name against the default platform standard or an optional custom regex.

Required input:

- `branch_name`: the branch name to validate.

Optional input:

- `allowed_regex`: a custom regex override for repositories with different naming requirements.

The action exits with:

- `0` when the branch name is valid.
- `1` when the branch name is invalid.

When invalid, it prints the expected format and valid examples so a beginner developer can fix the branch name.

## How This Fits Into The Platform

The intended flow is:

```text
application repo
  -> reusable workflow
  -> validate-branch-name composite action
```

Phase 3 created the composite action:

```text
actions/validate-branch-name/action.yml
```

Phase 4 connects that action to a reusable workflow:

```text
.github/workflows/reusable-branch-naming.yml
```

Application repositories should call the reusable workflow instead of copying branch validation logic into every repository.

Example flow:

```text
application repo
  -> caller workflow
  -> reusable workflow
  -> validate-branch-name composite action
```

## Push Vs Pull Request Branch Detection

GitHub Actions exposes branch names differently depending on the event.

For pull requests:

- The source branch is available as `github.head_ref`.
- This is the branch that the developer is asking to merge.

For push events:

- The pushed branch is available as `github.ref_name`.
- This is the branch that received the pushed commit.

The reusable branch naming workflow uses this rule:

```text
pull_request -> github.head_ref
push         -> github.ref_name
```

This matters because pull request workflows often run against a merge reference internally, and that merge reference is not the developer's actual branch name.

Additional valid examples:

- `feature/add-service-card`
- `design/update-hero-layout`
- `ci/add-security-scan`
- `docs/update-maintenance-guide`
- `hotfix/fix-contact-email`

## Future Extensibility

This standard can grow later without changing every application repository.

Possible future improvements:

- Add ticket prefixes such as `feature/ABC-123-add-login-page`.
- Add Jira or Taiga integration.
- Add protected branch logic.
- Add different rules for release branches.
- Add organization-specific allow lists through workflow inputs.

## Recommended Flow

1. Create a feature branch for each phase.
2. Add or update one reusable capability.
3. Update documentation and examples.
4. Open a pull request.
5. Review for security, portability, and naming.
6. Merge to `main`.
7. Create a version tag when the workflow is stable.

## Version Tags

Consumer repositories can reference:

```yaml
uses: your-github-org/platform-reusable-workflows/.github/workflows/static-site-ci.yml@main
```

This is convenient during early development, but production projects should eventually use tags:

```yaml
uses: your-github-org/platform-reusable-workflows/.github/workflows/static-site-ci.yml@v1
```

Tags reduce surprise changes for downstream repositories.

## Change Risk Levels

| Change Type | Risk | Guidance |
| --- | --- | --- |
| Documentation only | Low | Safe to merge after review. |
| New workflow | Medium | Test with an example consumer before broad use. |
| New optional input | Medium | Keep backwards compatibility. |
| Changed default behavior | High | Document clearly and consider a new major tag. |
| Removed input or output | High | Avoid unless creating a new major version. |

## Backwards Compatibility Rule

Reusable workflows become shared contracts. Once a project depends on a workflow input or output, avoid breaking it without a versioning plan.
