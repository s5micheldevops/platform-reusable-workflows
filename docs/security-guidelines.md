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

## Action Pinning

Prefer stable version pins such as:

```yaml
uses: actions/checkout@v4
```

For very sensitive workflows, consider pinning third-party actions by commit SHA.

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
