# Auth Security Assumptions and Residual Risks

## Assumptions
- Auth services run behind TLS-terminated infrastructure.
- JWT and refresh token secrets are provided by secure environment injection.
- Auth logs are retained in restricted-access infrastructure.
- Role claims are validated server-side on each protected request.

## Residual Risks (MVP)
- In-memory session persistence means restart clears active sessions.
- No distributed revocation cache yet for multi-instance deployments.
- Optional future factors (MFA/biometric) are not enforced in MVP baseline.
- Abuse controls depend on configured rate limits and lockout thresholds.

## Planned Follow-ups
- Introduce shared revocation store for horizontally scaled API.
- Add explicit challenge factor for high-risk auth events.
- Add periodic security review using `auth-abuse-checklist.md`.
