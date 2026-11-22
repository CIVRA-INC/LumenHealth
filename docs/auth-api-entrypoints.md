# Auth API Entrypoints

This document describes the current NestJS auth entrypoints implemented in `apps/api`.

## Source of truth

- Controller: `apps/api/src/modules/auth/controllers/auth.controller.ts`
- Guard: `apps/api/src/modules/auth/guards/auth.guard.ts`
- Token signer: `apps/api/src/modules/auth/services/token.service.ts` (`JwtAccessTokenSigner`)
- Session store: `apps/api/src/modules/auth/repositories/session.repository.ts`
- Identity store: `apps/api/src/modules/auth/repositories/identity.repository.ts`
- Password validation: `apps/api/src/modules/auth/validators/password.validator.ts`
- Rate limiter: `apps/api/src/modules/auth/rate-limit/rate-limiter.ts`
- Shared contract types: `packages/types/src/auth.ts`

All routes below are prefixed by the API global prefix `/api/v1` (see `apps/api/src/server.ts`), so the full path is `/api/v1/auth/...`.

## Routes

| Method | Path | Auth | Request | Success response | Notes / errors |
|---|---|---|---|---|---|
| `POST` | `/auth/login` | No | `LoginRequest` `{ email, password }` | `200` `LoginResponse` `{ session: { userId, clinicId, role, accessToken, refreshToken } }` | Rate-limited by IP. `400 AUTH_MISSING_CREDENTIALS`, `401 AUTH_INVALID_CREDENTIALS`, `429 AUTH_RATE_LIMITED`. |
| `POST` | `/auth/logout` | No | none | `200` `{ ok: true }` | Rate-limited by IP (`recovery` bucket). `429 AUTH_RATE_LIMITED`. |
| `GET` | `/auth/me` | `AuthGuard` Bearer token | none | `200` `MeResponse` `{ userId, clinicId, role, email }` | `401 AUTH_TOKEN_INVALID` when identity missing. `401 AUTH_UNAUTHORIZED` for missing/invalid token. |
| `GET` | `/auth/owner-only` | `AuthGuard` Bearer token | none | `200` `{ ok: true, userId, clinicId }` | `403 AUTH_FORBIDDEN` if role is not `owner`. |
| `POST` | `/auth/refresh` | No | `RefreshRequest` `{ refreshToken }` | `200` `{ ok: true, accessToken, refreshToken }` | Rotates refresh token. Reuse detection revokes token family. `401 AUTH_TOKEN_INVALID`, `429 AUTH_RATE_LIMITED`. |
| `POST` | `/auth/password-reset/request` | No | `PasswordResetRequestBody` `{ email }` | `200` `{ ok: true }` | Always returns `ok: true` shape; issues token only for known identity. Rate-limited. `400 AUTH_MISSING_CREDENTIALS`, `429 AUTH_RATE_LIMITED`. |
| `POST` | `/auth/password-reset/confirm` | No | `PasswordResetConfirmBody` `{ token, password }` | `200` `{ ok: true }` | Validates password policy and breached-password check after token validation. `400 AUTH_MISSING_CREDENTIALS`, `401 AUTH_TOKEN_INVALID`. |
| `POST` | `/auth/verify/request` | No | `VerifyRequestBody` `{ email }` | `200` `{ ok: true }` | Issues verification token for known identity. `400 AUTH_MISSING_CREDENTIALS`. |
| `POST` | `/auth/verify/confirm` | No | `VerifyConfirmBody` `{ token }` | `200` `{ ok: true, email, userId }` | Canonical verify-confirm path. `400 AUTH_MISSING_CREDENTIALS`, `401 AUTH_TOKEN_INVALID`. |
| `GET` | `/auth/metrics` | No | none | `200` `{ ok: true, metrics }` | Returns in-memory auth metrics snapshot. |

## Not implemented / canonical notes

- `POST /api/v1/auth/register` is **not** implemented in `AuthController`. Do not document or depend on it unless a route is added.
- The canonical email verification confirmation path is `POST /api/v1/auth/verify/confirm`. There is no `verify/complete` route.
- Legacy Express auth router stubs referenced by older docs are not the source of truth; use the NestJS controller above.

## Contract and guardrails

- Request/response contracts live in `@lumen/types` (`packages/types/src/auth.ts`).
- Access-token signing/verification goes through `AccessTokenSigner` / `JwtAccessTokenSigner`; do not inline JWT logic in controllers.
- Error responses should use `normalizeAuthError`/shared auth error helpers where applicable.
- Keep behavior changes backward compatible unless milestone notes explicitly call out a contract change.
