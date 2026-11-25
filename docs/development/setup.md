# Local setup

## Requirements

- Node 22.12+ (`nvm use` reads `.nvmrc`, which says 24), pnpm 11 (`corepack enable` or `npm i -g pnpm`)
- Docker (only for PostgreSQL)
- Google Chrome for local Playwright runs (CI installs its own Chromium)

## One command

```bash
pnpm bootstrap
```

Creates `.env` from `.env.example` (never overwrites), installs dependencies, starts PostgreSQL, builds `@lumen/contracts`, applies migrations and loads synthetic demo data. Safe to re-run; it never resets data.

## Daily development

```bash
pnpm dev          # builds contracts, then watches contracts + API + web
```

- Web: <http://localhost:5173> (Vite proxies `/api` to the API, so cookies are first-party)
- API: <http://localhost:4000>, Swagger UI at `/api/docs`, health at `/api/v1/health/ready`
- Demo accounts: see the README. Password `LumenDemo!2026` (development only; the seed refuses `NODE_ENV=production`).

## Manual steps (what bootstrap does)

```bash
cp .env.example .env
pnpm install
pnpm db:up                 # docker compose up -d --wait postgres
pnpm build:contracts
pnpm --filter @lumen/api db:generate
pnpm db:migrate            # prisma migrate deploy, as the schema owner
pnpm db:seed
```

## Initialising and resetting the development database

There are two situations, with two commands. Neither is run automatically.

**Empty or new database: initialise (non-destructive).** `pnpm bootstrap`, or by hand `pnpm db:migrate && pnpm db:seed`.
Seeding is atomic (one transaction): if it fails nothing is written and it can simply be run again. If the demo data is
already there it prints "Demo data already present" and changes nothing, so running it repeatedly never adds duplicates.
The seeded state: 330 + 2 patients, 7 users, 10 appointments, 3 encounters (see `testing.md`).

**Start over: `pnpm db:reset` (destructive, guarded).** It drops everything in the development database, reapplies the
migrations and reseeds. It targets exactly the URL Prisma resolves (`MIGRATION_DATABASE_URL`, else `DATABASE_URL`, from
`.env` unless your shell sets them; the shell wins) and checks it **before** doing anything:

- the database must be on this machine and named exactly `lumenhealth` (the e2e, visual and test databases, a remote host
  and `NODE_ENV=production` are all refused);
- `DATABASE_URL` and `MIGRATION_DATABASE_URL` must name the same database (a mismatch means the environment is not what
  you think);
- it prints the target and how many users, patients, appointments, encounters and audit events it holds, and you must type
  the database name to proceed (`--confirm=lumenhealth` for a script; a bare `yes` is never accepted).

```bash
pnpm db:reset --dry-run     # show the target and what it holds; change nothing
pnpm db:reset               # then type: lumenhealth
```

Prisma's own protection, which blocks `migrate reset` when invoked by an AI agent, is left in place; run `db:reset`
yourself in a terminal. To wipe everything including the Docker volume: `docker compose down -v`.

The other databases never need a manual reset: `lumenhealth_e2e` and `lumenhealth_visual` are dropped and rebuilt on every
`pnpm test:e2e` / `pnpm shots`, and `lumenhealth_test` on every API test run. Each of those commands refuses a database
whose name does not end in its own suffix.

## Two database roles (important)

- `lumen`: owner/superuser in Docker. Used by migrations, seed and tests' fixtures. Bypasses RLS.
- `lumen_app`: the API's runtime role. Subject to RLS and least-privilege grants.
  Both are created by `infrastructure/docker/postgres/init.sql` when the volume is first created. If you created the Postgres volume **before** this file existed or changed, recreate the roles manually or `docker compose down -v` and `pnpm bootstrap`.
