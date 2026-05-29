# Authentication Threat Model

Closes #443

## Scope

This document covers the authentication surface for the LumenHealth MVP: credential-based login, JWT session management, token refresh, and logout. Stellar keypair auth is out of scope for this milestone.

## Assets

| Asset | Sensitivity | Location |
|---|---|---|
| User credentials (email + password) | High | Database (hashed) |
| JWT access token | High | Client memory / httpOnly cookie |
| JWT refresh token | High | Client httpOnly cookie |
| `JWT_SECRET` | Critical | Server env only |
| User session state | Medium | API in-memory (milestone 1) |

## Threat Actors

- **Unauthenticated external attacker** — no valid session, targeting public endpoints.
- **Authenticated attacker** — valid session, attempting privilege escalation.
- **Compromised client** — XSS or malicious code running in the browser.
- **Insider / misconfigured service** — accidental secret exposure via logs or config.

## Threats and Mitigations

### T1 — Credential Brute Force

**Threat:** Attacker submits many login attempts to guess a password.

**Mitigation:**
- Rate-limit `POST /auth/login` per IP and per email.
- Lock account after N consecutive failures (emit `auth.account.locked`).
- Use bcrypt with cost factor ≥ 12 (`BCRYPT_ROUNDS`).

**Status:** Rate limiting and lockout are planned for milestone 1. bcrypt rounds configurable via `authConfig.bcryptRounds`.

---

### T2 — Token Theft via XSS

**Threat:** Malicious script reads the access token from JS-accessible storage.

**Mitigation:**
- Store tokens in `httpOnly`, `Secure`, `SameSite=Strict` cookies — not `localStorage`.
- Short access token TTL (default 15 min) limits the theft window.
- Refresh tokens are rotated on each use.

**Status:** Cookie storage is the target pattern. Token rotation is planned for milestone 1.

---

### T3 — JWT Secret Exposure

**Threat:** `JWT_SECRET` leaks via logs, error messages, or committed `.env`.

**Mitigation:**
- `JWT_SECRET` has no default — process fails at startup if absent.
- `.env` is in `.gitignore`.
- `authConfig` is the only access point; raw `process.env.JWT_SECRET` is never used outside `packages/config`.
- Logs must never include config values (enforced by code review).

**Status:** Structural controls in place. Log scrubbing is a milestone 1 task.

---

### T4 — Privilege Escalation

**Threat:** Authenticated user accesses resources belonging to another role or clinic.

**Mitigation:**
- JWT payload includes `role` and `clinicId`.
- `requireRole(role)` middleware rejects requests with insufficient role.
- All data queries are scoped to `clinicId` from the verified token — never from the request body.

**Status:** Middleware scaffold in `auth-domain.md`. Full RBAC in milestone 1.

---

### T5 — Token Replay After Logout

**Threat:** Attacker reuses a stolen access token after the user has logged out.

**Mitigation:**
- Short access token TTL (15 min) bounds the replay window.
- Refresh token is invalidated on logout (token revocation list in milestone 1).
- `auth.logout` event is emitted for audit.

**Status:** TTL-based mitigation active. Revocation list is milestone 1.

---

### T6 — CSRF on Cookie-Based Auth

**Threat:** Malicious site triggers state-changing requests using the victim's session cookie.

**Mitigation:**
- `SameSite=Strict` on auth cookies prevents cross-site submission.
- State-changing endpoints require a valid `Authorization: Bearer` header as a secondary check (double-submit pattern).

**Status:** Planned for milestone 1 when cookie auth is implemented.

## Out of Scope (This Milestone)

- Stellar keypair authentication
- OAuth / SSO providers
- Multi-factor authentication
- Session persistence across server restarts
- Distributed token revocation

## Review Cadence

This threat model should be revisited when:
- A new auth flow is added (OAuth, MFA, Stellar).
- The token storage strategy changes.
- A security incident occurs.
