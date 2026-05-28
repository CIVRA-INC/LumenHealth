# Auth Configuration Loading Strategy

Closes #441

## Overview

All auth-related environment variables are loaded through `packages/config`. No workspace calls `process.env` directly for auth values.

## Config Object

`authConfig` is exported from `@lumen/config` and consumed only by `apps/api`:

```ts
import { authConfig } from "@lumen/config";

// authConfig.jwtSecret       — JWT signing secret (required)
// authConfig.accessTokenTtl  — access token TTL in seconds (default: 900)
// authConfig.refreshTokenTtl — refresh token TTL in seconds (default: 604800)
// authConfig.bcryptRounds    — bcrypt cost factor (default: 12)
```

## Variable Ownership

| Variable | Workspace | Required | Default |
|---|---|---|---|
| `JWT_SECRET` | `apps/api` | Yes | — |
| `JWT_ACCESS_TTL` | `apps/api` | No | `900` |
| `JWT_REFRESH_TTL` | `apps/api` | No | `604800` |
| `BCRYPT_ROUNDS` | `apps/api` | No | `12` |

`JWT_SECRET` has no fallback — the process throws at startup if it is missing. This prevents silent misconfiguration in production.

## Workspace Rules

- `apps/api` imports `authConfig` from `@lumen/config`.
- `apps/web` and `apps/mobile` do not access auth secrets; they use `NEXT_PUBLIC_API_BASE_URL` to reach the API.
- `apps/stellar-service` does not read JWT variables.
- `packages/config` must not contain auth business logic — only typed env accessors.

## Loading Order

1. `dotenv` loads `.env` from the repo root at process start.
2. `packages/config/index.ts` reads and validates each variable via the `read()` helper.
3. `authConfig` is frozen at module load time — no runtime mutation.

## Local Setup

Ensure `.env` contains at minimum:

```
JWT_SECRET=<at-least-32-char-random-string>
```

See `auth-env.md` for the full variable reference.
