# Security Guidelines

Reusable workflows affect every repository that calls them. Treat changes in this repository as platform-level changes.

## General Security Principles

- Use the least permissions required.
- Avoid hardcoded credentials.
- Do not print secrets in logs.
- Prefer pinned action versions.
- Keep workflows generic and avoid project-specific secrets.
- Review pull request workflows carefully because they can run untrusted code.

## GitHub Token Permissions

Every reusable workflow should declare explicit permissions.

Example:

```yaml
permissions:
  contents: read
```

Only add broader permissions when the workflow needs them.

## Secrets

Secrets should be passed by the caller repository only when required.

Avoid designing workflows that assume every project has the same secret names.

Example pattern:

```yaml
secrets:
  deploy-token:
    required: false
```

## Secret Scanning With Gitleaks

Gitleaks is a tool that scans source code and Git history for values that look like secrets.

Beginner explanation:

- A secret is sensitive information that should not be public.
- Gitleaks looks for secret-like patterns before they become a bigger security problem.
- This platform repository provides a reusable composite action at `actions/gitleaks-scan/action.yml`.

### Why Secret Scanning Matters

Secrets often give direct access to private systems. If a secret is committed to a repository, it may be copied, indexed, cached, or downloaded before anyone notices.

Secret scanning helps catch mistakes such as:

- API keys.
- Passwords.
- Access tokens.
- Private keys.
- Cloud credentials.
- Database connection strings.

### Secret Leak vs Vulnerability vs Public Configuration

| Term | Meaning | Example |
| --- | --- | --- |
| Secret leak | Sensitive credential exposed in code, logs, or Git history. | A cloud access key committed to a repository. |
| Software vulnerability | A weakness in code or dependencies that attackers can exploit. | A package with a known CVE. |
| Normal public configuration | Non-sensitive settings that are safe to publish. | A public website URL or feature flag name. |

Gitleaks focuses on secret leaks. It does not replace dependency scanning or code security review.

### Why Git History Is Dangerous

Deleting a secret from the latest file version is not enough. Git keeps previous commits unless history is rewritten and all copies are cleaned up.

That means a secret can still exist in:

- Old commits.
- Branches.
- Pull request refs.
- Forks.
- Local clones.
- CI logs or artifacts.

For this reason, caller workflows should usually checkout full history with `fetch-depth: 0` when using secret scanning for serious validation.

### Rotate Exposed Secrets

If a secret is exposed, do not only delete it from code.

The safe response is:

1. Revoke or rotate the exposed secret in the system that issued it.
2. Remove the secret from the repository.
3. Review Git history and logs.
4. Replace the application configuration with a safe secret management approach.

Rotation matters because someone may have copied the secret before it was deleted.

### What To Do If Gitleaks Fails

If Gitleaks fails a job:

1. Read the Gitleaks finding carefully.
2. Confirm whether the detected value is a real secret or a false positive.
3. If it is real, rotate the secret immediately.
4. Remove the secret from code.
5. Move the value into the correct secret store or GitHub repository secret.
6. Re-run the workflow.
7. If it is a false positive, document the reason and add a narrowly scoped allow rule in a future controlled phase.

Do not paste the secret into tickets, chat, commit messages, or pull request comments.

### How This Fits Into The Platform

The intended platform flow is:

```text
Application repo
  -> caller workflow
  -> reusable workflow
  -> composite action
  -> Gitleaks scan
```

Phase 1 created the composite action:

```text
actions/gitleaks-scan/action.yml
```

Phase 2 connects that action to a reusable workflow:

```text
.github/workflows/reusable-gitleaks.yml
```

Application repositories should call the reusable workflow, not duplicate the scan logic.

The caller workflow or reusable workflow should handle `actions/checkout`. The composite action focuses only on validating inputs and running the scan.

Beginner explanation:

- The application repository contains the code being scanned.
- The caller workflow is a short workflow file inside the application repository.
- The reusable workflow lives in this platform repository and defines the shared job.
- The composite action lives in this platform repository and wraps the Gitleaks scan step.
- Gitleaks performs the actual secret scan.

The reusable workflow checks out both the caller repository and this platform repository. It needs the caller repository so there is code to scan, and it needs the platform repository so it can access the local composite action.

### What The Gitleaks Action Does Not Do

The Gitleaks composite action:

- Does not deploy applications.
- Does not build applications.
- Does not scan Docker images.
- Does not replace dependency scanning.
- Does not replace code review.
- Does not require cloud credentials.
- Does not require GitHub organization secrets.

## Action Pinning

Prefer stable version pins such as:

```yaml
uses: actions/checkout@v4
```

For very sensitive workflows, consider pinning third-party actions by commit SHA.

The Gitleaks composite action uses `gitleaks/gitleaks-action@v2`, which is a stable major version pin rather than a moving `latest` reference.

## Pull Request Safety

Be careful with workflows that:

- Run on pull requests from forks.
- Use deployment secrets.
- Publish packages or images.
- Write to cloud infrastructure.

Build and validation workflows are safer than deployment workflows for pull request events.

## Deployment Safety

Deployment workflows should include:

- Explicit environment selection.
- Required approvals for sensitive environments.
- Clear separation between validation and deployment.
- Minimal token permissions.

## Review Checklist

Before merging a reusable workflow:

- Does it use explicit permissions?
- Are secrets optional unless truly required?
- Are inputs documented?
- Is the workflow generic?
- Does the example avoid real credentials?
- Does it avoid printing sensitive values?
- Is the trigger controlled by the caller repository?
- If it scans secrets, does checkout happen in the caller workflow or reusable workflow instead of inside the composite action?
