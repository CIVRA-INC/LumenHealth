# LumenHealth

A multi-tenant electronic medical records (EMR) and hospital management platform, starting with the outpatient workflow:

**patient registration → appointment or walk-in → queue → consultation → clinical documentation → diagnosis → prescription → discharge**

- **Multi-tenant by design.** Organisations and branches are isolated in the API _and_ in the database (row-level security).
- **Careful clinical workflow.** Signed documentation is locked at the database; corrections are addenda; consequential actions need explicit confirmation.
- **Auditable.** Every sensitive read and every change is recorded in an append-only audit trail.
- **Cloud-first, offline-ready.** Globally unique ids and sync metadata from day one; a facility-local mode is a planned milestone.

Current status, verified commands and next steps live in [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md). Product milestones are in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Quick start

Requirements: Node 22.12+ (24 recommended, see `.nvmrc`), pnpm 11, Docker.

```bash
pnpm bootstrap   # .env, dependencies, PostgreSQL in Docker, migrations, synthetic demo data
pnpm dev         # contracts watcher + API (:4000) + web (:5173)
```

Open <http://localhost:5173> and sign in with a demo account (password `LumenDemo!2026`, development only):

| Account                    | Role                                       |
| -------------------------- | ------------------------------------------ |
| `frontdesk@lumen.test`     | Front desk: register, book, check in       |
| `nurse.adeyemi@lumen.test` | Nurse: queue, vitals                       |
| `dr.okafor@lumen.test`     | Clinician (also a member of another org)   |
| `dr.bello@lumen.test`      | Clinician (has a consultation in progress) |
| `admin@lumen.test`         | Administrator: staff, audit log            |
| `admin@harbour.test`       | Administrator of a second organisation     |
| `frontdesk@harbour.test`   | Front desk of the second organisation      |

All demo data is synthetic. API documentation: <http://localhost:4000/api/docs>.

## Repository layout

```
apps/api            NestJS modular monolith (REST /api/v1, Prisma, PostgreSQL)
apps/web            React + Vite workspace application
packages/contracts  Shared zod schemas, permissions, state machines (the API contract)
packages/ui         Design system: tokens and accessible components
packages/config     Shared TypeScript and ESLint configuration
infrastructure      Docker assets (PostgreSQL roles and databases)
docs                Architecture, decisions, development guides, project state
```

## Everyday commands

| Command                                   | What it does                                             |
| ----------------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                                | Run everything with hot reload                           |
| `pnpm check`                              | Format check, lint, types, tests, build (what CI runs)   |
| `pnpm test`                               | Unit and integration tests (needs `pnpm db:up`)          |
| `pnpm test:e2e`                           | Playwright journeys against a disposable database        |
| `pnpm db:up` / `pnpm db:down`             | Start / stop local PostgreSQL                            |
| `pnpm db:migrate` / `pnpm db:seed`        | Apply migrations / load demo data                        |
| `pnpm db:reset`                           | Drop and rebuild the dev database (guarded; `--dry-run`) |
| `pnpm shots`                              | Screenshots from a clean, isolated review database       |
| `pnpm --filter @lumen/api openapi:export` | Regenerate `docs/api/openapi.json`                       |

More in [`docs/development/`](docs/development/setup.md).

## Safety notes

- Everything here is for development and evaluation. **No real patient data** belongs in a development database, and no compliance or certification is claimed (see [privacy and compliance](docs/architecture/privacy-and-compliance.md)).
- Payments are **not implemented yet**; the provider boundary is designed in [`docs/architecture/payments.md`](docs/architecture/payments.md). Stellar support is not live.
