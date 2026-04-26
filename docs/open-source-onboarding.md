# Open-Source Onboarding Workflow

Welcome to LumenHealth! This guide walks you through everything you need to start contributing.

---

## Getting Started

1. **Fork** the repository on GitHub using the "Fork" button on the top right.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/LumenHealth.git
   cd LumenHealth
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. Add the upstream remote to keep your fork in sync:
   ```bash
   git remote add upstream https://github.com/CIVRA-INC/LumenHealth.git
   ```

---

## First Contribution

### Find a Good First Issue

- Browse issues labelled `good-first-issue` on the GitHub Issues tab.
- Leave a comment on the issue to let maintainers know you are working on it.

### Branch Naming Convention

Use the following pattern when creating a branch:

```
<type>/<short-description>
```

Examples:
- `feat/add-user-profile`
- `fix/login-redirect-bug`
- `docs/update-readme`

### PR Checklist

Before opening a pull request, make sure:

- [ ] Your branch is up to date with `upstream/main`
- [ ] The code follows the project's style guidelines
- [ ] All existing tests pass
- [ ] New behaviour is documented where appropriate
- [ ] The PR description references the related issue (e.g. `closes #123`)

---

## Code Review Process

1. A maintainer will be assigned to review your PR within 2–3 business days.
2. Address requested changes with new commits (do not force-push during review).
3. Once approved, a maintainer will merge your PR.
4. Delete your feature branch after the PR is merged.

---

## Communication Channels

- **GitHub Issues** — bug reports, feature requests, and task tracking
- **GitHub Discussions** — design proposals and open-ended questions
- **Pull Request comments** — inline code feedback and review discussion
- **Discord** — real-time community chat (link in the repository README)
