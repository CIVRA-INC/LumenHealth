# Contributing to LumenHealth

## Overview

LumenHealth is a monorepo. Development is organized around clinical milestones — each milestone adds a discrete set of functionality on top of a stable foundation.

Shipped today: authentication and sessions, clinic and staff management (including invitations), the audit trail, and the Stellar anchoring service. Patient records, encounters and billing are still future milestones (see the status table in the README) and must not be partially implemented in advance.

---

## Repository structure

```
apps/
  api/          NestJS backend (native ESM) — modular monolith
  web/          Next.js web application
  mobile/       React Native workspace (scaffold)
  stellar-service/  Stellar anchoring, signing and key rotation (Express)

packages/
  types/        Shared TypeScript contracts (@lumen/types)
  config/       Shared runtime configuration (@lumen/config)

docs/           Architecture and domain documentation
```

---

## Local setup

**Requirements:** Node.js 20, 22 or 24 (the versions CI tests; `.nvmrc` pins 24 for local use, `nvm use`), npm 10+. `engine-strict` is on, so `npm install` fails on Node older than 20.

```bash
git clone <repo>
cd lumenhealth
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

Run the API and web app in parallel:

```bash
npm run dev
```

---

## Running tests

```bash
# All workspaces
npm test

# API only
npm run test -w apps/api

# Web only
npm run test -w apps/web
```

---

## Formatting, hooks and commit messages

- Formatting: Prettier (`.prettierrc.json`, `.editorconfig`). `npm run format` rewrites files, `npm run format:check` is what CI runs.
- Git hooks (husky, installed by `npm install` through the `prepare` script): `pre-commit` runs `lint-staged` (eslint --fix and prettier on staged files) and `npm run check:boundaries`; `commit-msg` runs commitlint; `pre-push` runs the typecheck. To skip them for one command use `HUSKY=0`, for example `HUSKY=0 git commit -m "..."`; CI still enforces everything.
- Commit messages and PR titles follow Conventional Commits, `type(scope): subject`, with scopes `api`, `web`, `mobile`, `stellar`, `types`, `config`, `ci`, `docs` (for example `feat(api): add staff migration`). Mark breaking changes with `!` or a `BREAKING CHANGE:` footer. CI checks the PR title and every commit.
- Node version: `.nvmrc` (24) is the default every workflow reads; the CI matrix additionally tests 20 and 22, which `engines` allows.

## Coverage

`npm run test:coverage -w apps/api` (and `apps/web`, `packages/types`) runs vitest with the v8 provider and fails below the `coverage.thresholds` in that workspace's `vitest.config.ts`. CI uploads the reports as `coverage-*` artifacts. The current floors are placeholders; raise them to a few points below the numbers CI reports.

## Architecture constraints

Two automated checks enforce boundaries. Run them before opening a PR:

```bash
npm run check:architecture
npm run check:boundaries
```

- `check:architecture` — enforces the modular monolith layout in `apps/api`
- `check:boundaries` — enforces that workspaces do not import across forbidden boundaries

---

## Coding standards

- TypeScript strict mode throughout
- No `any` without a comment explaining why
- Business logic lives inside a module (`src/modules/<name>/`)
- Shared infrastructure lives in `src/shared/` — no business logic there
- Tests live inside the module (`src/modules/<name>/tests/`)

---

## Adding a new module (future milestones)

When a new milestone is scoped:

1. Create `apps/api/src/modules/<name>/` with: `router.ts`, `service.ts`, `repository.ts`, `validators.ts`, `types.ts`, `__tests__/`
2. Register the router in `apps/api/src/app.ts`
3. Add shared types to `packages/types/src/`
4. Write tests before opening a PR — CI fails when test coverage drops below the thresholds in each workspace's `vitest.config.ts` (see "Coverage" below)

Do not create partial implementations or placeholder endpoints for future modules. Incomplete code in `main` confuses contributors and breaks CI.

---

## Clinic isolation rules

All data in LumenHealth is scoped to a clinic. When implementing a new module follow these rules without exception:

1. **Extract `clinicId` from `req.auth.clinicId`** — never from `req.body` or `req.params` alone. The JWT is the source of truth for which clinic a request belongs to.

2. **Pass `clinicId` as the first argument to every repository list method.** No list query should ever return records from multiple clinics.

3. **On `findById`, verify `record.clinicId === req.auth.clinicId` before returning.** If the record belongs to a different clinic, return `undefined` — let the controller respond with 404.

4. **Return 404 (not 403) for cross-clinic resource access.** Returning 403 would confirm that the resource exists in another clinic, which is a data enumeration risk. A foreign resource must look identical to a missing one.

5. **Apply `requireClinicScope` to any route with `:clinicId` in the URL path.** Import it from `src/shared/middleware/clinic-scope.ts` and place it after `resolveAuthContext`:
   ```ts
   router.get("/:clinicId", resolveAuthContext, requireClinicScope("clinicId"), handler);
   ```

6. **Use `buildTwoClinicFixture()` in your integration tests** to verify your module enforces isolation. Import it from `src/modules/auth/tests/fixtures.ts`.

---

## Branching model and required checks

- `develop` is the integration branch: feature and fix branches (`feat/**`, `fix/**`) are merged into it by pull request. `main` receives promotions from `develop` and `release/**` branches.
- CI (`.github/workflows/ci.yml`) and the security scan run on pull requests into `main`, `develop` and `release/**`, and on pushes to those branches and to `feat/**` and `fix/**`.
- Branch protection (documented here; configured by a maintainer) on `develop` and `main` should require the checks `lint`, `typecheck`, `test`, `build`, `Architecture checks` and `Security Checks`, and a review before merging.
- CI runs everything through `turbo run`. To enable the Turborepo remote cache, set the repository secret `TURBO_TOKEN` and variable `TURBO_TEAM`; otherwise the local `.turbo` cache is restored with `actions/cache`.

## Pull requests

- One PR per milestone scope
- All tests must pass
- All lint checks must pass
- PR description should reference the milestone being implemented
