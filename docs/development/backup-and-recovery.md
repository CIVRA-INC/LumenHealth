# Backup and recovery

## Principles

Back up the whole database (data, RLS policies, triggers, grants are all in the dump). Encrypt backups before they leave the database host. Test restores on a schedule: an untested backup is not a backup. Backups contain patient data and are governed like the live system.

## Procedure (PostgreSQL custom format)

```bash
# Backup (inside the container locally; use the managed service's tooling in production)
docker compose exec -T postgres pg_dump -U lumen -Fc lumenhealth > lumenhealth-$(date -u +%Y%m%dT%H%M%SZ).dump

# Encrypt before storing off-host (example with age; any vetted tool works)
age -r <recipient-public-key> -o backup.dump.age backup.dump

# Restore into a NEW database, never over the live one
docker compose exec -T postgres psql -U lumen -d postgres -c "CREATE DATABASE lumenhealth_restore OWNER lumen"
docker compose exec -T postgres pg_restore -U lumen -d lumenhealth_restore --no-owner < backup.dump
```

After restoring: confirm the roles exist (`lumen_app`), run `pnpm db:migrate` against it (no-op if current), then run the smoke checks below.

## Smoke checks after a restore

- Row counts of `patients`, `encounters`, `audit_events` match the source.
- `select count(*) from pg_policies;` (14 today) and non-internal triggers (9 today) match the source.
- Sign in against the restored database and open a signed encounter.

## Drill record

| Date       | Scope                                       | Result                                                                                                                                                     |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-23 | Local e2e database (synthetic), Postgres 17 | `pg_dump -Fc` → `pg_restore` into a new database: 37 patients, 4 encounters, 50 audit events, 14 policies, 9 triggers: identical. Unencrypted; local only. |

## Still to do before pilot

Scheduled backups with retention; point-in-time recovery (WAL archiving) decision; encryption key custody and rotation; offsite copy; documented recovery time/point objectives; a restore drill in the real environment.
