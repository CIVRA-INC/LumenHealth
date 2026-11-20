# @lumen/api

NestJS (Express adapter) HTTP API for LumenHealth: authentication, clinics, staff and invitations,
and the tamper-evident audit log. Audit entries are anchored to Stellar by `apps/stellar-service`,
which this API calls for signing, anchoring and verification.

## Quick start

```bash
cp .env.example .env            # then replace every <generate ...> value
npm ci
npm run build -w packages/config -w packages/types   # shared packages must be built first
npm run dev -w apps/api         # http://localhost:4000
```

The API loads the repo-root `.env` through `@lumen/config` (override the location with
`LUMEN_ENV_FILE` where supported). `apps/stellar-service` must be reachable at
`STELLAR_SERVICE_URL` for exports, verification and anchoring.

## Scripts

| Script | What it does |
| --- | --- |
| `dev` | `tsx watch src/server.ts` — no build needed, but `@lumen/config` and `@lumen/types` must already be built. |
| `build` | `tsc -p tsconfig.build.json` — production build into `dist/` (tests and fixtures excluded). |
| `start` | `node dist/server.js` — requires a prior build of the shared packages **and** of this app. |
| `typecheck` | `tsc -p tsconfig.json --noEmit` — full project including tests. |
| `lint` | `eslint src`. |
| `test` | `vitest run`. |
| `migrate` | `tsx src/shared/migrations/cli.ts` — needs `MONGODB_URI`. |

## Environment variables

Read through `@lumen/config` (`packages/config/index.ts`). `npm run check:env-docs` fails when a
variable read there is missing from this table.

| Variable | Required | Default | Used by |
| --- | --- | --- | --- |
| `API_PORT` | no | `4000` | HTTP listen port (`server.ts`). |
| `STELLAR_NETWORK` | no | `testnet` | Stellar network name, shared with `apps/stellar-service`. |
| `STELLAR_HORIZON_URL` | no | `https://horizon-testnet.stellar.org` | Horizon endpoint, shared with `apps/stellar-service`. |
| `INTERNAL_SERVICE_TOKEN` | no | `dev-internal-token` | **Deprecated.** Static token superseded by `INTERNAL_SERVICE_SECRETS`; no longer consulted for authentication. Placeholder values are rejected in production. |
| `INTERNAL_SERVICE_SECRETS` | production: yes | `dev-key:dev-internal-secret` | Comma-separated `keyId:secret` pairs for signed service-to-service requests. The first signs outgoing requests; all are accepted on verification, so secrets rotate without downtime. **The default is for development only.** |
| `STELLAR_SERVICE_URL` | no | `http://localhost:4100` | Base URL of `apps/stellar-service` (audit export signing, verification, anchoring health). |
| `STELLAR_SERVICE_PORT` | no | `4100` | Listen port of `apps/stellar-service` (read here because both apps share the config package). |
| `ANCHOR_INTERVAL_MS` | no | `60000` | How often the anchoring job runs a batch (stellar-service). |
| `ANCHOR_RECONCILE_STALE_THRESHOLD_MS` | no | `900000` | Age of the oldest unanchored entry after which reconciliation forces an extra batch (stellar-service). |
| `JWT_SECRET` | **yes** | — | Auth secret. In production it must be at least 32 characters and not a placeholder. Never commit a real value. |
| `JWT_ACCESS_TTL` | no | `900` | **Currently unused:** read and exposed by `ConfigService`, but nothing consumes it yet. |
| `JWT_REFRESH_TTL` | no | `604800` | **Currently unused:** read and exposed by `ConfigService`, but nothing consumes it yet. |
| `BCRYPT_ROUNDS` | no | `12` | **Currently unused:** read and exposed by `ConfigService`, but nothing consumes it yet. |

Variables read outside `@lumen/config`:

| Variable | Required | Used by |
| --- | --- | --- |
| `AUTH_ACCESS_TOKEN_KEY` | **yes** (>= 32 chars, not a known default) | Access-token signing (`token.service.ts`). |
| `AUTH_ACCESS_TOKEN_KEY_PREVIOUS` | no | Previous key accepted during rotation. |
| `MONGODB_URI`, `MONGODB_DB` | no | Database connection (`shared/db/connection.ts`); without a URI `/health/ready` reports no database. |
| `MONGODB_CONNECT_TIMEOUT_MS`, `MONGODB_MAX_POOL_SIZE`, `MONGODB_CONNECT_RETRIES`, `MONGODB_RETRY_DELAY_MS` | no | Connection tuning. |
| `AUDIT_ARCHIVE_DIR` | no | Cold-archive directory for retained audit entries. |
| `AUDIT_RETENTION_INTERVAL_MS`, `AUDIT_INTEGRITY_INTERVAL_MS`, `AUDIT_INTEGRITY_SAMPLE_SIZE` | no | Retention and integrity-sampling jobs. |

## Routes

Everything is served under `/api/v1` except `/health`, `/health/ready` and `/internal/audit/*`.

**Public (no bearer token)**

- `POST /api/v1/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password-reset/request|confirm`, `/auth/verify/request|confirm`
- `POST /api/v1/staff/invitations/accept`
- `POST /api/v1/audit/verify-export` — rate limited and concurrency capped; checks an export bundle against Stellar.
- `GET /api/v1/metrics`, `GET /api/v1/auth/metrics`

**Authenticated (bearer access token)**

- `GET /api/v1/auth/me`, `GET /api/v1/auth/owner-only`
- `POST /api/v1/clinics`, `GET|PATCH|DELETE /api/v1/clinics/:clinicId` (clinic scoped)
- `GET /api/v1/staff`, `PATCH /api/v1/staff/:staffId/role`
- `POST|GET /api/v1/staff/invitations`, `DELETE /api/v1/staff/invitations/:invitationId`
- `GET /api/v1/audit`, `GET /api/v1/audit/export`, `GET /api/v1/audit/anchoring-health`, `GET /api/v1/audit/:auditId/verify` — owner or admin only.

**Internal (not routed through the public gateway)**

- `GET /internal/audit/unanchored` and `POST /internal/audit/anchor-result` — authenticated with
  HMAC-signed service-to-service requests (`INTERNAL_SERVICE_SECRETS`), consumed by `apps/stellar-service`.

**Health**: `GET /health` (liveness) and `GET /health/ready` (503 when a database is configured but unreachable).

## Dependency on stellar-service

Audit export signing, export verification, anchoring health and immediate anchoring all call
`STELLAR_SERVICE_URL`. When it is down these routes return `502 STELLAR_SERVICE_UNAVAILABLE`;
list and entry routes keep working.
