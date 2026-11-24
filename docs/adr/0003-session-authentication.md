# ADR 0003: Server-side sessions in an HttpOnly cookie

**Status:** accepted · **Date:** 2026-10-23

## Decision

- Password login (argon2id, OWASP-minimum cost). On success the API creates a `sessions` row and sets an opaque 256-bit random token in `lh_session` (HttpOnly, SameSite=Lax, Secure in production). Only the SHA-256 of the token is stored.
- Sessions have an absolute lifetime (12 h) and an idle timeout (60 min), are revoked on logout, role/status change, branch removal and password change, and are re-validated on every request (user active, membership active, branch still permitted).
- Active organisation and branch live on the session; switching is an authenticated server call.
- CSRF: SameSite=Lax, JSON-only bodies, and an Origin check on state-changing requests. The browser talks to the API same-origin (Vite proxy in development, reverse proxy in production), so CORS is off.
- Brute force: per-IP throttle on login and per-account lockout (5 failures → 15 minutes). Unknown accounts take the same time as wrong passwords.

## Alternatives rejected

JWTs in `localStorage` (script-readable, hard to revoke). Stateless JWT cookies (revocation and role changes lag).

## Consequences

A database read per request (indexed by token hash; negligible at pilot scale). Immediate revocation and no secrets in the browser.
