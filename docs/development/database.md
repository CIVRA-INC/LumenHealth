# Database, migrations and raw-SQL objects

## Workflow

- Schema: `apps/api/prisma/schema.prisma`; migrations: `apps/api/prisma/migrations/*`; config: `prisma.config.ts` (Prisma 7: URL lives in the config, not the schema).
- Apply: `pnpm db:migrate` (`prisma migrate deploy`). Create a migration by editing the schema and generating SQL, then **reviewing it**:
  ```bash
  cd apps/api
  mkdir prisma/migrations/<UTC timestamp>_<name>
  pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/<…>/migration.sql
  ```
  (or `pnpm db:migrate:dev` interactively, which needs a shadow database). Never edit a migration that has been applied anywhere; add a new one.
- Destructive changes (drops, type narrowing) must preserve data: add-then-backfill-then-drop across separate migrations.

## Raw-SQL objects Prisma cannot see

Prisma's diff does not model these, so a generated migration may propose to **drop** them. Remove any such statements from generated SQL. The integration tests fail if any is lost.

| Object                                                                                                                                                                                                         | Migration                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `btree_gist` extension                                                                                                                                                                                         | `…100100_security_and_invariants`                            |
| Grants for `lumen_app`, default privileges, REVOKE on `audit_events`                                                                                                                                           | `…100100`                                                    |
| RLS enablement and policies; function `app_current_org()`                                                                                                                                                      | `…100100`                                                    |
| Append-only triggers/functions on `audit_events`                                                                                                                                                               | `…100100`                                                    |
| `appointments_time_order` CHECK; `appointments_no_clinician_overlap` EXCLUDE; `appointments_one_live_visit_per_patient` partial unique; transition trigger                                                     | `…100100`                                                    |
| `appointments_no_patient_overlap` EXCLUDE                                                                                                                                                                      | `…100200_patient_overlap`                                    |
| Encounter CHECKs and transition trigger; lock triggers on notes/vitals/diagnoses/orders; addenda trigger                                                                                                       | `…100100`, replaced function in `…100300_fix_unlock_trigger` |
| `diagnoses_one_primary_per_encounter` partial unique; vitals CHECKs; patients DOB CHECK                                                                                                                        | `…100100`                                                    |
| `pg_trgm` extension; trigram GIN indexes `patients_{given_name,family_name,mrn,phone}_trgm` (substring search)                                                                                                 | `…100400_search_and_sort_indexes`                            |
| `sessions_scope_consistent` CHECK; `invitations_one_pending_per_email` partial unique; `invitations_state_consistent` and `invitations_email_lowercase` CHECKs; grants on `invitations`, `invitation_branches` | `…20261125100000_multi_hospital_onboarding`                  |

Creating `pg_trgm` (like `btree_gist`) needs extension privileges on the target database. The btree sort indexes in the same migration are declared in `schema.prisma`; the trigram indexes are not (Prisma cannot express operator classes), so a generated migration may propose dropping them.

New tenant tables **must** (1) carry `organizationId`, (2) reference parents with composite FKs, (3) get `ENABLE ROW LEVEL SECURITY` + a `tenant_isolation` policy in their migration, (4) have deliberate grants (default is select/insert/update only). The one exception is `invitations`, which is looked up by token hash before any organisation context exists; it is outside RLS on purpose and every authenticated query filters on `organizationId` (ADR 0011).

## Time

Store UTC (`timestamptz`). Use `date` only for calendar facts (date of birth). "Today" for a branch is computed with the organisation's IANA zone.

## Backup and restore

See [`backup-and-recovery.md`](backup-and-recovery.md).
