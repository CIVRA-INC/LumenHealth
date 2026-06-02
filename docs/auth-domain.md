# Auth Domain Module Boundary

Closes #436

## Overview

The auth domain is the first milestone boundary in LumenHealth. It defines where authentication logic lives in each workspace and what each workspace is allowed to own.

## Boundary Rules

| Workspace | Owns | Must Not |
|---|---|---|
| `apps/api` | Token issuance, session validation, password hashing, RBAC middleware | Store tokens client-side or call other app workspaces |
| `apps/web` | Login/logout UI, token storage in memory or httpOnly cookie, route guards | Implement auth logic; delegate to API |
| `apps/mobile` | Login/logout UI, secure token storage, offline session state | Implement auth logic; delegate to API |
| `apps/stellar-service` | Stellar keypair auth, horizon auth headers | Issue JWTs or manage user sessions |
| `packages/types` | Shared request/response/error contracts for auth | Contain runtime logic |
| `packages/config` | Auth-related env var access (JWT secret, token TTL) | Contain auth business logic |

## Module Structure

```
apps/api/src/
  auth/
    router.ts          # Express routes: POST /auth/login, POST /auth/logout, GET /auth/me
    service.ts         # Business logic: validateCredentials, issueToken, revokeToken
    middleware.ts      # requireAuth, requireRole(role) Express middleware
    types.ts           # Internal types (not exported to packages/types)

apps/web/app/
  auth/
    login/page.tsx     # Login page built from reusable primitives
    _components/
      auth-card.tsx    # Shared auth shell surface and copy frame
      auth-field.tsx   # Shared labeled field primitive
      auth-roadmap.tsx # Shared roadmap/list primitive for auth milestones
    logout/            # Logout route handler

apps/mobile/
  auth/                # Placeholder for mobile auth screens

packages/types/src/
  auth.ts              # Shared contracts (LoginRequest, LoginResponse, AuthError, etc.)
  index.ts             # Re-exports all public types
```

## Auth Flow Ownership

```
Client (web/mobile)
  → POST /api/v1/auth/login  [apps/api owns]
  ← { session: AuthSession } [packages/types contract]
  → stores accessToken        [client owns]
  → Authorization: Bearer <token> on subsequent requests
  → apps/api middleware validates token [apps/api owns]
```

## Workspace Import Rules

- `apps/api` may import `@lumen/types` and `@lumen/config`
- `apps/web` may import `@lumen/types` and `@lumen/config`
- `apps/mobile` may import `@lumen/types` and `@lumen/config`
- No app workspace may import from another app workspace
- `packages/types` must not import from any app workspace

Run `npm run check:boundaries` to enforce these rules before opening a PR.
