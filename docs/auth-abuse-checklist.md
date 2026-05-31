# Auth Abuse-Case Checklist

Use this checklist in future auth PR reviews.

- [ ] Brute-force path is rate-limited and/or lockout-aware.
- [ ] Token replay and refresh reuse are rejected.
- [ ] Session expiration path returns deterministic error codes.
- [ ] Password-reset flow avoids account enumeration leaks.
- [ ] Logs avoid plaintext secrets and raw credential payloads.
- [ ] Role checks fail closed when role is unknown or missing.
- [ ] New auth endpoints include negative-path tests.
