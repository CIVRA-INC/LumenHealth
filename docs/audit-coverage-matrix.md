# Audit coverage matrix — every mutating route in `apps/api`

One row per mutating endpoint (`@Post` / `@Put` / `@Patch` / `@Delete`)
declared under `apps/api/src/modules/**`, keyed by file + mount + verb +
path. The gate in `apps/api/src/shared/tests/audit-coverage-matrix.test.ts`
scans the controllers and fails when a mutating route exists without a row
here (or a row here no longer matches a real route), so a new mutating
endpoint cannot ship without an explicit audit decision.

- **Status `covered`** — a `recordAudit` call for the declared action exists
  in the module's source.
- **Status `gap`** — the action is declared (or should exist) but no
  `recordAudit` call lands yet; the Notes column says what is missing.
- **Status `exempt`** — no audit entry by decision; the Notes column gives
  the rationale.

`none` in the action column means no `AuditAction` is emitted for the route
(see the union in `packages/types/src/audit.ts`).

| File | Mount | Verb | Path | Handler | Audit action | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| apps/api/src/modules/audit/controllers/audit.controller.ts | /audit | POST | verify-export | verifyExport | none | exempt | Read-only verification (POST verb, no state change); public-endpoint abuse protection tracked in #1336. |
| apps/api/src/modules/audit/controllers/internal-audit.controller.ts | /internal/audit | POST | anchor-result | submitAnchorResult | batch.anchored | covered | `applyBatchAnchorResult` in `audit.service.ts` records one `batch.anchored` entry per clinic. |
| apps/api/src/modules/auth/controllers/auth.controller.ts | /auth | POST | login | login | none | exempt | Outcomes go to `authLogger` and the `auth_login_*` metrics; no `auth.login` AuditAction exists — candidate follow-up. |
| apps/api/src/modules/auth/controllers/auth.controller.ts | /auth | POST | logout | logout | none | exempt | Session teardown; no `auth.logout` AuditAction. |
| apps/api/src/modules/auth/controllers/auth.controller.ts | /auth | POST | refresh | refresh | none | exempt | Token rotation; refresh-token reuse is logged and metered; no AuditAction. |
| apps/api/src/modules/auth/controllers/auth.controller.ts | /auth | POST | password-reset/request | passwordResetRequest | auth.password_reset_requested | gap | Action declared in the union; no `recordAudit` call yet. |
| apps/api/src/modules/auth/controllers/auth.controller.ts | /auth | POST | password-reset/confirm | passwordResetConfirm | auth.password_reset_completed | gap | Action declared in the union; no `recordAudit` call yet. |
| apps/api/src/modules/auth/controllers/auth.controller.ts | /auth | POST | verify/request | verifyRequest | none | exempt | Email-verification token issue; low sensitivity, no AuditAction. |
| apps/api/src/modules/auth/controllers/auth.controller.ts | /auth | POST | verify/confirm | verifyComplete | none | exempt | Consumes the verification token; no AuditAction. |
| apps/api/src/modules/clinic/controllers/clinic.controller.ts | /clinics | POST | <root> | create | none | gap | Tenant creation is unaudited and no `clinic.created` AuditAction exists — follow-up. |
| apps/api/src/modules/clinic/controllers/clinic.controller.ts | /clinics | PATCH | :clinicId | update | clinic.updated | gap | Action declared in the union; no `recordAudit` call yet. |
| apps/api/src/modules/clinic/controllers/clinic.controller.ts | /clinics | DELETE | :clinicId | archive | clinic.archived | covered | `clinic.service.ts` records before/after status (that module has a pre-existing broken import — call present in source). |
| apps/api/src/modules/metrics/metrics.controller.ts | / | POST | password-reset/request | requestPasswordReset | none | exempt | Root-level stub returning a canned response for the `/auth` route — pre-existing duplication, out of scope. |
| apps/api/src/modules/metrics/metrics.controller.ts | / | POST | password-reset/confirm | confirmPasswordReset | none | exempt | Root-level stub for the `/auth` route — pre-existing duplication, out of scope. |
| apps/api/src/modules/staff/controllers/invitation.controller.ts | /staff/invitations | POST | <root> | send | staff.invited | gap | Action declared; no `recordAudit` call yet (batched mode per ADR 0002 once it lands). |
| apps/api/src/modules/staff/controllers/invitation.controller.ts | /staff/invitations | POST | accept | accept | staff.invitation_accepted | gap | Action declared; no `recordAudit` call yet — immediate-critical per ADR 0002 once it lands. |
| apps/api/src/modules/staff/controllers/invitation.controller.ts | /staff/invitations | DELETE | :invitationId | revoke | staff.invitation_revoked | gap | Action declared; no `recordAudit` call yet. |
| apps/api/src/modules/staff/controllers/staff.controller.ts | /staff | PATCH | :staffId/role | updateRole | staff.role_changed | covered | `staff.service.ts` records before/after role; immediate-critical per ADR 0002. |
