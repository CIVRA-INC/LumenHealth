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

---

### T7 — Account Enumeration via Response Timing

**Threat:** `POST /auth/login` answered immediately for unknown emails (no bcrypt work), so response timing distinguished registered from unregistered addresses — and a registration endpoint answering "email taken" would confirm accounts on demand.

**Mitigation:**
- Unknown-email logins now perform a **dummy bcrypt compare** (same algorithm and cost 12 as every application password hash) before returning the same `AUTH_INVALID_CREDENTIALS` body as a wrong password — `apps/api/src/modules/auth/services/login-timing.ts`, wired in the login handler.
- Failure responses are uniform: unknown email and wrong password both answer `AUTH_INVALID_CREDENTIALS` (401) with identical bodies.

**Registration policy (decided trade-off):** There is currently **no registration handler in the NestJS API** (the Express `register` export was dropped during the migration). The policy that binds whoever adds it: registration must answer a **uniform accepted response plus a verification email for every address** — never an `AUTH_EMAIL_TAKEN`-style reply that confirms an account exists. Trade-off: someone re-registering an address that already has an account gets no instant "email taken" error (worse UX on that path); the verification email carries the "this address already has an account — sign in instead" message, so the flow still converges. The enumeration win is worth the UX cost. (`AUTH_EMAIL_TAKEN` stays in the error table for API-client use; the endpoint must not distinguish it in its response.)

**Status:** Login timing equalization implemented (`performDummyPasswordCompare`, unit-tested in `apps/api/src/modules/auth/tests/login-timing.test.ts`). Registration handler absent — policy above is binding when it lands.

---

### T8 — Credential Stuffing via Known-Breached Passwords

**Threat:** Users set passwords that already appear in breach corpora, so attackers replay them without any guessing.

**Mitigation:**
- Password validation is extended with a **k-anonymity range check** against the Have I Been Pwned range API: only the first 5 hex characters of the password's SHA-1 leave the process; the full digest never does (`checkPasswordBreached`, `password.validator.ts`).
- **2 s timeout**; on outage or timeout the check degrades to a bundled **offline corpus** of the most common breached passwords, and otherwise **fails open** — a third-party outage must never block a legitimate password reset. Degradation increments `auth_password_breach_check_degraded_total` and logs `auth.password_breach.check_degraded`.
- Rejections increment `auth_password_breach_rejected_total` and log `auth.password_breach.rejected`.
- `POST /auth/password-reset/confirm` rejects breached candidates; the check runs **after** the reset token is validated so unauthenticated callers cannot make the API call out to the range API.

**Status:** Implemented on password reset; register path pending the registration handler (T7) and must call `validatePasswordWithBreaches`, which combines policy and breach screening.

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
