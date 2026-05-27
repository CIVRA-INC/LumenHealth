# Authentication Abuse-Case Checklist

> This checklist must be reviewed against every PR that touches authentication, session management, or authorization code. Future auth PRs should reference this document in their description.

## 1. Credential Abuse

| # | Abuse Case | Mitigation | Status |
|---|-----------|------------|--------|
| 1.1 | **Brute-force login** — attacker tries many passwords | Rate limiting on `/api/v1/auth/login` (e.g., 5 attempts/min per IP) | ⬜ TODO |
| 1.2 | **Credential stuffing** — leaked email/password pairs from other breaches | Check against known breach databases; enforce password complexity | ⬜ TODO |
| 1.3 | **Password spray** — common passwords across many accounts | Lockout after N failed attempts; require MFA for sensitive roles | ⬜ TODO |
| 1.4 | **Timing attacks on login** — response time reveals valid emails | Use constant-time comparison for all credential checks | ⬜ TODO |
| 1.5 | **Username enumeration** — different errors for invalid email vs wrong password | Return generic "invalid credentials" message | ⬜ TODO |

## 2. Session Abuse

| # | Abuse Case | Mitigation | Status |
|---|-----------|------------|--------|
| 2.1 | **Session fixation** — attacker sets victim's session ID before login | Regenerate session ID on successful authentication | ⬜ TODO |
| 2.2 | **Session hijacking** — stolen access token used from different IP/UA | Bind sessions to IP/UA fingerprint; detect anomalies | ⬜ TODO |
| 2.3 | **Token replay** — captured JWT used after logout | Short-lived access tokens (15min); refresh token rotation | ⬜ TODO |
| 2.4 | **Concurrent session abuse** — user logged in on many devices | Limit concurrent sessions per user (e.g., 5) | ⬜ TODO |
| 2.5 | **Zombie sessions** — sessions that outlive intended lifetime | Enforce absolute session timeout (e.g., 24h) regardless of activity | ⬜ TODO |
| 2.6 | **Refresh token theft** — stolen refresh token grants new access tokens | Rotate refresh tokens on use; detect reuse → revoke family | ⬜ TODO |

## 3. Authorization Abuse

| # | Abuse Case | Mitigation | Status |
|---|-----------|------------|--------|
| 3.1 | **Privilege escalation** — clinician accessing admin endpoints | Server-side role check on every protected route (never trust client) | ⬜ TODO |
| 3.2 | **Horizontal privilege escalation** — accessing another clinic's data | Validate `clinicId` from session matches resource's clinic | ⬜ TODO |
| 3.3 | **Insecure direct object reference (IDOR)** — changing `userId` in request | Always derive user identity from session, never from request body | ⬜ TODO |
| 3.4 | **Missing function-level access control** — admin API callable by any role | Middleware that checks role against required role per route | ⬜ TODO |
| 3.5 | **Role manipulation in JWT** — tampering with role claim | Sign JWTs with strong secret; validate signature on every request | ⬜ TODO |

## 4. Token Abuse

| # | Abuse Case | Mitigation | Status |
|---|-----------|------------|--------|
| 4.1 | **JWT algorithm confusion** — `alg: none` attack | Explicitly validate algorithm in JWT verification; reject `none` | ⬜ TODO |
| 4.2 | **JWT key leakage** — signing secret exposed in logs/env | Never log tokens; use environment variables; rotate keys regularly | ⬜ TODO |
| 4.3 | **Token not invalidated on password change** — old tokens still work | Invalidate all sessions on password change | ⬜ TODO |
| 4.4 | **Token not invalidated on role change** — old role persists in token | Use short-lived tokens; check role from DB, not just token | ⬜ TODO |
| 4.5 | **API key leakage** — hardcoded or committed keys | Scan for secrets in CI; use `.env` files; never commit keys | ⬜ TODO |

## 5. Password Reset Abuse

| # | Abuse Case | Mitigation | Status |
|---|-----------|------------|--------|
| 5.1 | **Reset token brute-force** — guessing short tokens | Use cryptographically random tokens (32+ bytes); expire after 15min | ⬜ TODO |
| 5.2 | **Reset token reuse** — same token used multiple times | Invalidate token after single use | ⬜ TODO |
| 5.3 | **Email enumeration via reset** — different responses for existing vs non-existing accounts | Always show "if account exists, email sent" | ⬜ TODO |
| 5.4 | **Open redirect in reset link** — redirect to malicious site after reset | Validate redirect URLs against allowlist | ⬜ TODO |

## 6. Rate Limiting & DoS

| # | Abuse Case | Mitigation | Status |
|---|-----------|------------|--------|
| 6.1 | **Login endpoint flooding** — overwhelming auth service | Rate limit per IP and per account | ⬜ TODO |
| 6.2 | **Password reset spam** — sending many reset emails | Rate limit reset requests (1/hour per email) | ⬜ TODO |
| 6.3 | **Token refresh flooding** — many refresh requests | Rate limit refresh endpoint; detect refresh token reuse | ⬜ TODO |
| 6.4 | **Account lockout DoS** — locking out legitimate users by failing intentionally | Progressive delays instead of hard lockouts; CAPTCHA after N failures | ⬜ TODO |

## 7. HIPAA-Specific (Healthcare Context)

| # | Abuse Case | Mitigation | Status |
|---|-----------|------------|--------|
| 7.1 | **Unauthorized PHI access** — viewing patient records without authorization | Role-based access + clinic-scoped permissions + audit logging | ⬜ TODO |
| 7.2 | **Audit log tampering** — deleting evidence of unauthorized access | Immutable audit logs (append-only) | ⬜ TODO |
| 7.3 | **Session sharing** — clinician sharing credentials with untrained staff | Unique credentials per user; prohibit shared accounts | ⬜ TODO |
| 7.4 | **Break-the-glass bypass** — emergency access without logging | Log all emergency access; require post-hoc justification | ⬜ TODO |

## Review Protocol

When reviewing auth-related PRs:

1. **Check each relevant row** in this checklist
2. **If a new abuse case is discovered**, add it to this document
3. **Mark status**: ⬜ TODO, 🔄 In Progress, ✅ Done
4. **Reference this checklist** in the PR description

---

*Last updated: 2026-05-27*
*Next review: When auth MVP milestone begins*
