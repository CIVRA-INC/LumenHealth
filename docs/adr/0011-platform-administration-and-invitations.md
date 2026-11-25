# ADR 0011: Platform administration and invitation-based onboarding

**Status:** accepted · **Date:** 2026-11-25

## Context

LumenHealth hosts several independent hospitals. Until now every account lived inside one organisation and was created with a temporary password shared out of band. We need a trusted operator who registers hospitals, and a way for each hospital to bring in its own staff, without ever sharing a password.

## Decision

**Platform access is a property of the user, not of any hospital.** `users.platformRole` (enum `PLATFORM_ADMIN`, null for everyone else) is a separate column from `memberships.role`. Platform permissions (`platform.organizations.read|manage`, `platform.invitations.manage`) are a separate namespace in `packages/contracts`; no organisation role grants them and `permissionsForRole` can never return one. There are no fake memberships.

**Two principals, never mixed.** A session either has `membershipId` + `branchId` (organisation scope) or neither (platform scope); a CHECK constraint enforces the shape and `SessionService` additionally requires `users.platformRole` for a platform session, so demoting the user ends their access on the next request. The request carries `req.ctx` (organisation, unchanged) or `req.platform` (new `PlatformContext`, no organisation id), so platform code has no tenant to leak and tenant code cannot receive a platform principal.

**Explicit authorization.** `@RequirePlatformPermissions(...)` is the only way into `/platform/*`. `PermissionsGuard` refuses an organisation session (audited as `access.denied`) and refuses a platform session on every organisation route. Routes still need exactly one of `@Public`, `@Authenticated`, `@AnyPrincipal`, `@RequirePermissions` or `@RequirePlatformPermissions`; undeclared routes remain refused.

**Invitations replace temporary passwords.** `invitations` (+ `invitation_branches` with composite FKs to the branches of the same organisation) hold an offer: organisation, email, role, branches, expiry. The token is 256 random bits (`crypto.randomBytes`), emailed once and stored only as a SHA-256 hash. Acceptance claims the row with a conditional `UPDATE … WHERE status='PENDING' AND expiresAt > now()` inside the same transaction that creates the user and membership, so two simultaneous attempts cannot both succeed and a failure leaves nothing behind. Resend rotates the token (the old link dies); revoke is terminal. Expiry is derived (`PENDING` and past `expiresAt`), never stored.

**Existing people keep their accounts.** If the email already has an account, acceptance requires that account's current password, never changes it, never touches other memberships, and adds the new membership. Platform operators cannot be invited into a hospital.

**Organisation lifecycle.** `organizations.status` (`ACTIVE`/`SUSPENDED`). Suspending revokes every staff session immediately and blocks sign-in, context switching, resending and acceptance; data is retained. Reactivating restores access.

**Bootstrap is an operator command, not an endpoint.** `node dist/scripts/bootstrap-platform-admin.js` creates the first platform administrator in one transaction under an advisory lock, refuses if any platform administrator exists or the email is already an account, hashes with `PasswordService`, forces a password change at first sign-in, and audits `platform.bootstrap` without secrets. There is no HTTP way to create a platform administrator.

**Email is an abstraction that tells the truth.** `EmailService` drivers: `smtp` (nodemailer), `log` and `memory` (development/tests; refused in production by configuration validation), `disabled`. A failed or unconfigured send leaves the invitation `PENDING` with `delivery=FAILED`; the UI says so and offers Resend. Links are built from `APP_BASE_URL` (never request headers) with the token in the URL **fragment**, which browsers never send to servers or proxies; the page removes it from the address bar on load.

## Security consequences

- The `invitations` table is **not** row-level-secured, unlike tenant clinical tables: acceptance runs before any session or organisation context exists, and the token hash is the only public handle. Every authenticated query is pinned to `ctx.organizationId` (tested for cross-organisation 404s). `memberships`, `users` and `organizations` were already outside RLS; no existing policy was changed.
- Platform actions about one hospital are audited under that hospital's `organizationId` (visible in its audit log, protected by the existing audit RLS policies); bootstrap and platform sign-in are unscoped.
- Public endpoints (`/invitations/inspect`, `/invitations/accept`) are rate-limited; unknown, malformed and used tokens produce the same `INVITATION_UNAVAILABLE`/`UNAVAILABLE` shape; a missing token still spends a hash verification to equalise timing.
- Tokens never reach logs, audit metadata, error messages or the database.

## Policy decisions (defaults accepted by the owner, 2026-11-25; easy to change)

1. Only `ORG_ADMIN` may invite, and may grant any organisation role including `ORG_ADMIN`; branches are limited to the inviter's own branches.
2. Hospitals are registered by invitation only; there is no "direct registration with a temporary password".
3. One platform administrator can be bootstrapped; creating more platform administrators is deliberately not available yet.
4. Invitation validity is 7 days (`INVITATION_TTL_HOURS`).
5. A previously disabled member who is re-invited is re-enabled with the invited role and branches.
6. The legacy `POST /admin/users` (temporary password) endpoint is kept for backward compatibility but no longer used by the UI.
