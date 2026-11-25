# Security model

Status of each control. "Verified" means covered by an automated test that ran in this session.

| Concern                         | Control                                                                                                                                  | Status                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Credentials at rest             | argon2id (19 MiB, 2 passes); no plaintext anywhere; seed password is development-only and the seed refuses production                    | Verified (hash tests)                                  |
| Session handling                | Opaque token, SHA-256 stored, HttpOnly+SameSite=Lax(+Secure in prod), idle + absolute timeout, revocation on role/branch/password change | Verified                                               |
| Brute force                     | Per-account lockout; login throttle (10/min/IP); equal-time response for unknown users                                                   | Lockout verified; throttle configured, not load-tested |
| CSRF                            | SameSite, JSON-only, Origin allow-list on non-GET                                                                                        | Verified                                               |
| Authorisation                   | Permission per route, secure by default; attending-only clinical edits; admins have no clinical access                                   | Verified (RBAC tests, e2e)                             |
| Tenant isolation                | Query scoping + RLS + composite FKs; 404 for foreign resources                                                                           | Verified (API, DB, e2e)                                |
| Input validation / output shape | zod at every boundary; views map explicit fields (no ORM objects leak: e.g. password hashes)                                             | Verified                                               |
| Audit                           | Reads of patient/encounter data, all writes, sign-ins, denials; append-only; no clinical content                                         | Verified                                               |
| Error messages                  | Envelope with stable codes; 5xx hide internals                                                                                           | Verified (envelope)                                    |
| Headers                         | helmet defaults; same-site resource policy                                                                                               | Configured                                             |
| Secrets                         | Environment-only, validated at boot (production requires Secure cookies); `.env` git-ignored; no secrets in the frontend                 | Configured                                             |
| Logging                         | Path-only request logs; cookie/authorization removed; no bodies                                                                          | Configured; deployed-environment review pending        |
| Backups                         | Procedure and local restore drill documented; encryption procedure documented, not yet automated                                         | Drill verified locally                                 |
| Dependency hygiene              | pnpm build scripts allow-listed; minimum release age on; `pnpm audit` in CI                                                              | CI defined, not yet run remotely                       |
| Private document storage        | Not introduced yet (S3-compatible private bucket with signed URLs when documents arrive)                                                 | n/a                                                    |

## Threats this does **not** cover yet

Compromised database credentials or SQL execution as `lumen_app` (RLS context could be altered); denial of service beyond simple throttling; insider misuse beyond audit visibility (no anomaly alerts); physical/endpoint security; multi-factor authentication (planned before production); field-level encryption of especially sensitive columns (decision pending).

## Production hardening checklist

See `docs/development/production-readiness.md`.
