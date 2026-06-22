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

## Pull requests

- One PR per milestone scope
- All tests must pass
- All lint checks must pass
- PR description should reference the milestone being implemented
