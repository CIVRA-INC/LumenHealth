# Auth Secret Rotation Procedure

This runbook defines the minimum safe rotation path for auth signing and session secrets.

## Scope
- JWT signing secret (`JWT_SECRET`)
- Refresh/session secret material (if externalized)
- Any auth-related API keys used by auth services

## Rotation Steps
1. Generate new secrets in the platform secret manager.
2. Stage deploy with dual-read window:
- Keep old secret as fallback verifier.
- Use new secret for fresh signing.
3. Verify health:
- `POST /api/v1/auth/login` returns valid session.
- `POST /api/v1/auth/refresh` rotates tokens without spike in failures.
- `GET /api/v1/auth/metrics` does not show abnormal `auth_refresh_failure_total`.
4. Cut over:
- Remove old verifier after expiry window passes.
- Force logout of stale sessions if required by policy.
5. Audit:
- Capture rotation timestamp, operator, and incident link in ops notes.

## Validation Checklist
- No secret values are logged.
- Auth logs include request IDs for traceability.
- Rollback secret is retained until validation completes.

## Access-token key ring (`token.service.ts`, implemented)

The access-token signer (`apps/api/src/modules/auth/services/token.service.ts`)
implements the dual-read window described above as a **kid key ring**:

- `AUTH_ACCESS_TOKEN_KEY` — the active secret; the only key new tokens are
  signed with. Must be at least 32 characters and not a known default value.
- `AUTH_ACCESS_TOKEN_KEY_PREVIOUS` — the retiring secret; verify-only. Optional.
- `kid` is derived, never configured: `k` + first 8 hex chars of the
  secret's SHA-256 (`deriveKid`). Two secrets cannot collide in practice and
  rotation needs no extra env plumbing.

### Rotation steps (zero downtime)

1. Generate a new random secret (≥ 32 chars, e.g. `openssl rand -base64 48`).
2. Deploy with `AUTH_ACCESS_TOKEN_KEY=<new>` and
   `AUTH_ACCESS_TOKEN_KEY_PREVIOUS=<old>`. Tokens already in the wild keep
   verifying via the previous kid; fresh logins/refreshes sign with the new kid.
3. Verify health: `POST /api/v1/auth/login` succeeds, `POST /api/v1/auth/refresh`
   rotates without a spike in `auth_refresh_failure_total`.
4. After the access-token TTL (15 m) plus grace, unset
   `AUTH_ACCESS_TOKEN_KEY_PREVIOUS` and redeploy. The retiring kid stops
   verifying and the old secret can be destroyed.

### Startup validation

The key ring is built at module load. A missing, shorter-than-32-characters,
or known-default secret (including a weak `AUTH_ACCESS_TOKEN_KEY_PREVIOUS`)
**fails the process at startup** with an explicit error instead of quietly
signing forgeable tokens. Never fall back to a hardcoded secret.

### One-time note for the hardening deploy

Verify pins `alg=HS256`, `iss=lumenhealth-api` and
`aud=lumenhealth-api-access`, and requires a matching `kid`. Tokens issued
before this hardening (no kid/iss/aud) are rejected — every session drops
once at that deploy and users simply log in again. This is intentional and
needs no migration.
