# Auth Abuse-Case Checklist

This checklist defines the security abuse scenarios that every authentication-related PR must satisfy before merge. It is aligned with the LumenHealth shared auth contracts and the OWASP Authentication Cheat Sheet.

## How to Use This Checklist

Every PR that touches authentication, session management, token handling, or authorization **must** include a section in the PR body confirming which abuse cases were considered and how they are mitigated. Copy the relevant items below into your PR description.

---

## 1. Credential Abuse

- [ ] **Brute-force protection**: Login endpoints enforce rate limiting or account lockout after repeated failed attempts.
- [ ] **Credential stuffing resistance**: Login does not reveal whether an email exists in the system (generic error messages).
- [ ] **Password policy enforcement**: Passwords meet minimum length, complexity, and breach-database checks before acceptance.
- [ ] **Password reset abuse**: Reset tokens are single-use, time-limited, and do not leak user existence.
- [ ] **Email enumeration prevention**: Registration and password-reset flows return identical responses for existing and non-existing emails.

## 2. Token Abuse

- [ ] **Access token expiry**: Access tokens have a short, configurable TTL (e.g., 15 minutes). Expired tokens are rejected.
- [ ] **Refresh token rotation**: Refresh tokens are rotated on each use. Reuse of a previously rotated token invalidates the entire token family.
- [ ] **Refresh token replay rejection**: A refresh token can only be used once. Replayed tokens trigger session revocation.
- [ ] **Token revocation on logout**: Logout invalidates both access and refresh tokens server-side.
- [ ] **Token scope minimization**: Tokens carry only the claims needed for the request context (userId, clinicId, role).
- [ ] **Secret rotation safety**: Token signing secrets can be rotated without invalidating active sessions (grace period support).

## 3. Session Abuse

- [ ] **Session fixation prevention**: A new session is created on login; existing session identifiers are not reused.
- [ ] **Session fingerprinting**: Sessions are bound to a fingerprint (e.g., User-Agent + IP range) and flagged on mismatch.
- [ ] **Concurrent session limits**: The system enforces a configurable maximum number of active sessions per user.
- [ ] **Session expiry enforcement**: Idle and absolute session timeouts are enforced server-side.
- [ ] **Session cleanup**: Expired sessions are garbage-collected and cannot be resurrected.
- [ ] **Suspicious login detection**: Login from a new device, location, or fingerprint triggers a re-authentication or notification.

## 4. Rate Limiting and Denial of Service

- [ ] **Login endpoint rate limiting**: `/api/v1/auth/login` is rate-limited per IP and per email address.
- [ ] **Refresh endpoint rate limiting**: `/api/v1/auth/refresh` is rate-limited per user and per token family.
- [ ] **Registration endpoint rate limiting**: `/api/v1/auth/register` is rate-limited per IP.
- [ ] **Password reset rate limiting**: Password reset requests are rate-limited per email and per IP.
- [ ] **Graceful degradation**: Rate-limited responses return `429 Too Many Requests` with a `Retry-After` header.

## 5. Authorization Abuse

- [ ] **Privilege escalation prevention**: A user cannot elevate their role or access resources outside their assigned role.
- [ ] **Clinic-scoped isolation**: A user in Clinic A cannot access resources belonging to Clinic B.
- [ ] **Horizontal access control**: A user cannot access another user's data within the same clinic unless explicitly permitted by their role.
- [ ] **Role validation on every request**: The API guard middleware validates the user's role and permissions on every protected route, not just at login.
- [ ] **Forbidden-state UX**: When access is denied, the client receives a clear `403 Forbidden` response with actionable guidance.

## 6. Audit and Monitoring

- [ ] **Failed login logging**: Failed login attempts are logged with timestamp, IP, email (hashed), and failure reason.
- [ ] **Suspicious activity alerts**: Unusual patterns (e.g., rapid login attempts, token replay) trigger alerts or log entries.
- [ ] **Session lifecycle logging**: Session creation, renewal, and revocation events are logged.
- [ ] **No sensitive data in logs**: Tokens, passwords, and secrets are never logged in plaintext.

## 7. API Surface Hardening

- [ ] **Input validation**: All auth endpoints validate and sanitize input before processing.
- [ ] **Error message sanitization**: Auth error responses do not leak internal implementation details.
- [ ] **HTTPS enforcement**: All auth endpoints require HTTPS in production.
- [ ] **CORS configuration**: Auth endpoints have restrictive CORS policies matching the web app origin.

---

## PR Template Addition

Add the following section to your PR description for any auth-related change:

```markdown
## Auth Abuse-Case Review

- [ ] I have reviewed `docs/auth-abuse-checklist.md`
- [ ] All relevant abuse cases from the checklist have been addressed or explicitly marked as out-of-scope with justification
- [ ] New attack surfaces introduced by this PR are documented below

### New attack surfaces (if any):
<!-- Describe any new attack surfaces and their mitigations -->

### Out-of-scope items (if any):
<!-- List any checklist items not addressed and explain why -->
```

---

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Token-Based Authentication](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [LumenHealth Auth Contracts](../packages/types/src/index.ts)
- [LumenHealth RBAC Model](./rbac-model.md)
