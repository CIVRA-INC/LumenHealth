# Migrations

`npm run migrate -w @lumen/api` (up) and `npm run migrate -w @lumen/api -- down [steps]` run the
migration runner in `apps/api/src/shared/migrations/`. It needs `MONGODB_URI`.

- Migrations are registered in `migrations/index.ts`, ordered by `version`.
- Applied versions are recorded in the `schema_migrations` collection; re-running `up` skips them.
- A lock document in `schema_migrations_lock` stops two runners from migrating at once.

## Rolling out index builds on large collections

1. Build the smallest, most selective indexes first (partial and unique indexes).
2. Build compound indexes one per migration, in a low-traffic window.
3. Ship the code that relies on an index only after the migration has completed everywhere.
4. `down` drops the index; take a snapshot before running destructive migrations.

Run `up` twice in CI against a fresh database and a snapshot to prove it is idempotent.
