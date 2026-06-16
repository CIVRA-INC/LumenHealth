# Contributing to LumenHealth

## Overview

LumenHealth is a monorepo. Development is organized around clinical milestones — each milestone adds a discrete set of functionality on top of a stable foundation.

The current foundation scope is **authentication only**. All other modules (clinic management, patient records, encounters, billing) are described in the README as future milestones and must not be partially implemented in advance.

---

## Repository structure

```
apps/
  api/          Express backend — modular monolith
  web/          Next.js web application
  mobile/       React Native workspace (scaffold)
  stellar-service/  Stellar integration (scaffold)

packages/
  types/        Shared TypeScript contracts (@lumen/types)
  config/       Shared runtime configuration (@lumen/config)

docs/           Architecture and domain documentation
```

---

## Local setup

**Requirements:** Node.js 20+, npm 10+

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
- Tests live inside the module: `src/modules/<name>/__tests__/`

---

## Adding a new module (future milestones)

When a new milestone is scoped:

1. Create `apps/api/src/modules/<name>/` with: `router.ts`, `service.ts`, `repository.ts`, `validators.ts`, `types.ts`, `__tests__/`
2. Register the router in `apps/api/src/app.ts`
3. Add shared types to `packages/types/src/`
4. Write tests before opening a PR — CI will reject untested modules

Do not create partial implementations or placeholder endpoints for future modules. Incomplete code in `main` confuses contributors and breaks CI.

---

## Pull requests

- One PR per milestone scope
- All tests must pass
- All lint checks must pass
- PR description should reference the milestone being implemented
