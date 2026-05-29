# Auth Observability Baseline

Closes #444

## Overview

This document defines the structured logging and metrics baseline for the auth domain. All auth events produce machine-readable log lines. No external observability service is required for the MVP — stdout JSON is the transport.

## Log Format

Every auth log entry is a single JSON line written to stdout:

```json
{
  "level": "info",
  "event": "auth.login.success",
  "userId": "usr_abc123",
  "clinicId": "cln_xyz",
  "timestamp": "2026-05-29T15:00:00.000Z",
  "durationMs": 42,
  "meta": {}
}
```

| Field | Type | Notes |
|---|---|---|
| `level` | `"info" \| "warn" \| "error"` | Severity |
| `event` | `AuthEventType` | From `auth-events.md` taxonomy |
| `userId` | `string \| undefined` | Absent on pre-auth failures |
| `clinicId` | `string \| undefined` | Absent on pre-auth failures |
| `timestamp` | ISO-8601 string | UTC |
| `durationMs` | `number \| undefined` | Present on login and token ops |
| `meta` | `Record<string, unknown>` | Event-specific context |

## Log Levels by Event

| Event | Level | Rationale |
|---|---|---|
| `auth.login.success` | `info` | Normal operation |
| `auth.login.failure` | `warn` | Expected but noteworthy |
| `auth.logout` | `info` | Normal operation |
| `auth.token.refreshed` | `info` | Normal operation |
| `auth.token.expired` | `warn` | Client should refresh |
| `auth.recovery.requested` | `info` | Normal operation |
| `auth.recovery.completed` | `info` | Normal operation |
| `auth.account.locked` | `warn` | Requires operator attention |
| Unexpected error in auth handler | `error` | Needs investigation |

## Sensitive Field Rules

Auth logs must never include:

- Passwords or password hashes
- Raw JWT tokens or signing secrets
- Full request bodies on login routes
- PII beyond `userId` and `clinicId`

The `authLogger` enforces this by accepting only the fields defined in `AuthLogEntry` — no free-form object spreading.

## Implementation

`apps/api/src/auth/logger.ts` exports `authLogger`, a thin wrapper around `console.log` that serialises `AuthLogEntry` to JSON:

```ts
import { authLogger } from "./logger.js";

authLogger.info("auth.login.success", { userId, clinicId, durationMs });
authLogger.warn("auth.login.failure", { meta: { reason: "invalid_credentials" } });
authLogger.error("auth.login.failure", { meta: { reason: "unexpected", error: err.message } });
```

The logger is synchronous and has no external dependencies — it is safe to use in any Express handler or middleware.

## Metrics Baseline (Design Only)

Full metrics instrumentation is deferred to a later milestone. The following counters and histograms are the target surface:

| Metric | Type | Labels |
|---|---|---|
| `auth_login_total` | Counter | `result: success \| failure`, `clinicId` |
| `auth_token_refresh_total` | Counter | `result: success \| failure` |
| `auth_account_locked_total` | Counter | `clinicId` |
| `auth_login_duration_ms` | Histogram | `result` |

These will be exposed on `GET /metrics` (Prometheus format) when a metrics library is added. The log events defined above are the source of truth until then — a log-scraping pipeline can derive the same counters from structured JSON.

## Ownership

- `apps/api` owns all auth log emission. Clients (web, mobile) do not emit auth logs.
- Log output goes to stdout. The deployment platform (Docker, ECS, etc.) is responsible for log routing.
- `authLogger` must not be imported by `packages/config` or `packages/types`.

## Local Verification

Run the API and trigger an auth route:

```bash
npm run dev
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' | jq .
```

The terminal running the API should print a JSON log line for the attempt.
