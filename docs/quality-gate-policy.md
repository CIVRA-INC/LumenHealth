# Pull Request Quality Gate Policy

All pull requests to the `main` branch must satisfy the following quality gates before merging.

## Required Checks

### 1. CI Must Pass
All automated CI checks must complete successfully. No failing jobs are permitted at merge time.

### 2. Reviewer Approval
A minimum of **1 reviewer approval** is required before a PR can be merged. Self-approvals are not counted.

### 3. No Merge Conflicts
The branch must be up to date with `main` and have no unresolved merge conflicts.

### 4. Test Coverage
Test coverage must not decrease compared to the base branch. Coverage regressions will block the merge.

### 5. No New Linting Errors
The PR must introduce zero new linting errors. Existing lint warnings should not be increased.

### 6. Conventional Commit Format
All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

Allowed prefixes: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`, `revert`.

**Example:**
```
feat(auth): add OAuth2 login support
fix(api): handle null response from health endpoint
docs(readme): update setup instructions
```

## Enforcement

These gates are enforced via GitHub branch protection rules on `main`. PRs that do not satisfy all conditions cannot be merged through the GitHub UI or API.
