# Auth Secret Rotation Procedure

This runbook describes how rotation works **today**. The access-token signer
(`apps/api/src/modules/auth/services/token.service.ts`) keeps a small key ring, so access
tokens can be rotated without logging everyone out.

## What is rotated

| Variable | Role |
|---|---|
| `AUTH_ACCESS_TOKEN_KEY` | Active access-token signing secret. The only key new tokens are signed with. Min 32 characters, not a known default or a `REPLACE_ME` placeholder. |
| `AUTH_ACCESS_TOKEN_KEY_PREVIOUS` | Optional retiring secret; verify-only. |
| `JWT_SECRET` | Read by `@lumen/config` (`authConfig`) and required at startup, but **not** the access-token signing key. Rotating it does not change access-token validity. |

The `kid` header of each token is derived from the secret (`k` plus the first 8 hex characters of
its SHA-256); it is never configured.

## Pre-flight

1. Confirm the variable names above in the target environment (`AUTH_ACCESS_TOKEN_KEY`, not
   `JWT_SECRET`).
2. Expected user impact with the steps below: none; tokens issued under the old key keep
   verifying until you remove `AUTH_ACCESS_TOKEN_KEY_PREVIOUS`. If you skip step 2 and replace
   the key in one step, every outstanding access token is rejected immediately and users
   re-authenticate through their refresh session.
3. Rollback: restore the previous value of `AUTH_ACCESS_TOKEN_KEY` (and remove
   `AUTH_ACCESS_TOKEN_KEY_PREVIOUS`) and redeploy. Keep the old secret until validation finishes.

## Rotation steps

1. Generate a new secret in the platform secret manager (for example `openssl rand -base64 48`).
2. Deploy with `AUTH_ACCESS_TOKEN_KEY=<new>` and `AUTH_ACCESS_TOKEN_KEY_PREVIOUS=<old>`.
   Existing tokens verify through the previous key; new logins and refreshes sign with the new one.
3. Verify health: `POST /api/v1/auth/login` returns a session, `POST /api/v1/auth/refresh` rotates
   tokens, and `GET /api/v1/auth/metrics` shows no spike in `auth_refresh_failure_total`.
4. After the access-token TTL (`JWT_ACCESS_TTL`, 15 minutes by default) plus a grace period, unset
   `AUTH_ACCESS_TOKEN_KEY_PREVIOUS` and redeploy. The old key stops verifying and can be destroyed.
5. Record the rotation timestamp, operator and incident link in the ops notes.

## Startup validation

The key ring is built at module load. A missing, too short, placeholder or known-default
`AUTH_ACCESS_TOKEN_KEY` or `AUTH_ACCESS_TOKEN_KEY_PREVIOUS` stops the process at startup with an
explicit error. There is no fallback to a hardcoded secret.

## Token format

Verification pins `alg=HS256`, `iss=lumenhealth-api` and `aud=lumenhealth-api-access` and needs a
matching `kid`. Tokens issued before the hardening deploy (no `kid`/`iss`/`aud`) are rejected, so
that deploy ended every session once; users logged in again.

## Validation checklist

- No secret values are logged.
- Auth logs include request IDs for traceability.
- The rollback secret is retained until validation completes.
