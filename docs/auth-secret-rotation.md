# Auth Secret Rotation Procedure

This runbook defines the minimum safe rotation path for auth signing and session secrets.

## Scope
- JWT signing secret (`JWT_SECRET`)
- Refresh/session secret material (if externalized)
- Any auth-related API keys used by auth services

## Rotation Steps
1. Generate new secrets in the platform secret manager.
2. Stage deploy with dual-read window:
- Keep old secret as fallback verifier.
- Use new secret for fresh signing.
3. Verify health:
- `POST /api/v1/auth/login` returns valid session.
- `POST /api/v1/auth/refresh` rotates tokens without spike in failures.
- `GET /api/v1/auth/metrics` does not show abnormal `auth_refresh_failure_total`.
4. Cut over:
- Remove old verifier after expiry window passes.
- Force logout of stale sessions if required by policy.
5. Audit:
- Capture rotation timestamp, operator, and incident link in ops notes.

## Validation Checklist
- No secret values are logged.
- Auth logs include request IDs for traceability.
- Rollback secret is retained until validation completes.
