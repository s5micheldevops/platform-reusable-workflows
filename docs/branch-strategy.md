# Branch Strategy

This repository should use a simple and predictable branch strategy.

## Recommended Branches

| Branch | Purpose |
| --- | --- |
| `main` | Stable default branch. Reusable workflows on this branch should be safe for active projects. |
| Feature branches | Short-lived branches for adding or changing one workflow or documentation area. |

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
