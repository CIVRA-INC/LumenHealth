# Testing

| Layer             | Tool                                 | Location                           | Needs                            | Run                                   |
| ----------------- | ------------------------------------ | ---------------------------------- | -------------------------------- | ------------------------------------- |
| Contracts (unit)  | Vitest                               | `packages/contracts/src/*.test.ts` | nothing                          | `pnpm --filter @lumen/contracts test` |
| API unit          | Vitest                               | `apps/api/src/**/*.test.ts`        | Postgres (global setup migrates) | `pnpm --filter @lumen/api test`       |
| API integration   | Vitest + Supertest + real PostgreSQL | `apps/api/test/*.test.ts`          | `pnpm db:up`                     | same                                  |
| UI package        | Vitest + Testing Library (jsdom)     | `packages/ui/src/**/*.test.tsx`    | nothing                          | `pnpm --filter @lumen/ui test`        |
| Web unit          | Vitest + Testing Library             | `apps/web/src/**/*.test.ts(x)`     | nothing                          | `pnpm --filter @lumen/web test`       |
| End-to-end + a11y | Playwright + axe                     | `apps/web/e2e/*.spec.ts`           | Postgres, Chrome                 | `pnpm test:e2e`                       |

`pnpm test` runs contracts, UI, API and web unit/integration tests; `pnpm check` adds format, lint, types, build.

## How the integration tests work

- They boot the real Nest app and talk to a real PostgreSQL database (`lumenhealth_test`), connected as the **restricted `lumen_app` role** exactly as in production. `test/global-setup.ts` drops, recreates and migrates that database before every run, so each run starts empty.
- Each test file creates its own isolated organisation (`createWorld`) with a user per role and random names, so files do not interfere and no cleanup is needed between files. Nothing carries over between runs.
- Fixtures that are not the subject of a test are created through an owner connection; DB-invariant tests use the owner connection deliberately to prove the database itself refuses bad writes.

## What the suites prove (non-exhaustive)

- **Tenant isolation:** cross-org reads/updates/schedules/encounters return 404; RLS hides rows without context and blocks writes into another tenant; composite FKs reject cross-org/cross-patient links; audit is append-only for both roles.
- **RBAC:** each role's allowed/denied operations; admin has no clinical access; denials are audited; role/status changes affect live sessions immediately.
- **Workflow:** full journey; incomplete documentation cannot be signed; signed content locked in API **and** database; addenda; wrong-patient guard; concurrent start (exactly one wins); void returns patient to queue; clinician/patient double-booking blocked; urgent-first queue.
- **Registry:** MRN uniqueness under concurrency; duplicate warning/override; hard ID duplicate; stale-version updates rejected; no search text in audit.
- **Pagination:** `apps/api/test/pagination.test.ts`: metadata, short and out-of-range pages, every record exactly once across pages in each sort order, invalid page/size/sort rejected, other tenants never returned, stable when rows are added mid-paging; staff and audit lists.
- **Browser:** the same journeys through the UI, access denial, cross-org, sign-out, duplicate confirmation, registry search/sort/paging/error-retry, long-name wrapping, phone-width default page size, staff and audit filters in the URL, WCAG 2.1 A/AA automated checks.

## Rules

Never delete or weaken an assertion to get green. Prefer deterministic doubles to live third parties (relevant for the payment milestone). New business rules need a test that fails without the rule.

## Databases and test data

Four databases, each with one purpose. Records created by tests or by visual tooling never go into the
development database.

| Database             | Used by               | Lifecycle                                                                                                                           |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `lumenhealth`        | `pnpm dev`, you       | Seeded once (`pnpm db:seed`); reset only by you (`pnpm db:reset`, guarded: see `setup.md`). Holds the demo seed and your edits      |
| `lumenhealth_test`   | API integration tests | **Dropped, recreated and migrated from scratch before every run** (empty at the start; each file then creates its own organisation) |
| `lumenhealth_e2e`    | `pnpm test:e2e`       | **Dropped, migrated and seeded on every run** (`e2e:prepare`); the tests add random patients and a cross-tenant fixture             |
| `lumenhealth_visual` | `pnpm shots`          | **Dropped, migrated and seeded on every run** (`visual:prepare`); the only place adversarial fixtures live                          |

- **The standard seed** (`apps/api/prisma/seed.ts`) is deterministic and synthetic: Lumen General Hospital with 330
  patients (30 named demo patients plus 300 generated from fixed name lists), Harbour Clinic with 2 (tenant-isolation
  checks), 7 users, 10 appointments and 3 encounters today. It has no random values and no adversarial records. It
  runs in **one transaction**, so a failure leaves an empty database, never a half-seeded one.
- **Isolation guards.** The destructive helpers refuse any database not named for their purpose (`*_e2e`, `*_visual`, `*_test`;
  `prisma/disposable-db.ts`, tested in `test/disposable-db.test.ts`), and `pnpm db:reset` refuses everything except the local
  `lumenhealth` (`prisma/dev-target.ts`, tested in `test/dev-target.test.ts`). The Playwright run asserts at start that the e2e
  database is exactly the documented seed (330 / 2 patients, 7 users) and at the end that none of its test records
  appeared in the development database (`e2e/database-guard.ts`).
- **Where test-only records come from:** `Tenant Boundary` (cross-tenant check), the random-letter names (journey and
  duplicate-registration tests) are created by `apps/web/e2e/*.spec.ts` in `lumenhealth_e2e`. The 60-character name and
  long clinical note are created by the screenshot tool in `lumenhealth_visual`.

## Visual review

`pnpm shots` builds its own clean stack: it recreates `lumenhealth_visual` from the standard seed, starts the API
(port 4020) and the web app (5175) against it, adds the adversarial fixtures to that database only, signs in as each
demo role, writes full-page PNGs of the key screens at 1440×900, 1280×800 and 390×844 to `apps/web/screenshots/`
(git-ignored), and stops everything. Every run starts from the same state. Options: `SIZES=mobile`, `FULL=1`, and
screen names as arguments (`pnpm shots encounter-long patients`).

`pnpm --filter @lumen/web shots` photographs whatever server is at `BASE_URL` and creates no records. Use it
against `pnpm dev` to look at your own data.
