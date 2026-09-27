# Auth Configuration Loading Strategy

Closes #441

## Overview

All auth-related environment variables are loaded through `packages/config`. No workspace calls `process.env` directly for auth values.

## Config Object

`authConfig` is exported from `@lumen/config` and re-published inside `apps/api`
as an injectable provider by `ConfigModule` (`src/shared/config/`):

```ts
import { ConfigService } from "./shared/config/config.service.js";

// config.jwtSecret       — JWT signing secret (required)
// config.accessTokenTtl  — access token TTL in seconds (default: 900)
// config.refreshTokenTtl — refresh token TTL in seconds (default: 604800)
// config.bcryptRounds    — bcrypt cost factor (default: 12)
```

`ConfigModule` is the only module in `apps/api` permitted to import
`@lumen/config`. Everything else injects `ConfigService`, or the
`AUTH_CONFIG` / `SERVER_CONFIG` tokens when a test needs to override a single
value. This keeps the values injectable for testing without adding a second
`.env` parser alongside the one `packages/config` already owns.

## Variable Ownership

| Variable | Workspace | Required | Default |
|---|---|---|---|
| `JWT_SECRET` | `apps/api` | Yes | — |
| `JWT_ACCESS_TTL` | `apps/api` | No | `900` |
| `JWT_REFRESH_TTL` | `apps/api` | No | `604800` |
| `BCRYPT_ROUNDS` | `apps/api` | No | `12` |

`JWT_SECRET` has no fallback — the process throws at startup if it is missing. This prevents silent misconfiguration in production.

## Workspace Rules

- `apps/api` reaches `authConfig` only through `ConfigModule` / `ConfigService`; no feature module imports `@lumen/config` directly.
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
