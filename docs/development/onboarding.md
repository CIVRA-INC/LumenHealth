# Multi-hospital onboarding (production runbook)

Design and security reasoning: [ADR 0011](../adr/0011-platform-administration-and-invitations.md). This page is the operational procedure. **Nothing here has been run against production.**

## Who does what

| Person                 | Capability                                                                                                    | How they get access                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Platform administrator | Register hospitals, invite their first administrator, resend/revoke invitations, suspend/reactivate hospitals | Provisioned once with the bootstrap command (below) |
| Hospital administrator | Branches, departments, staff, invitations for their own hospital                                              | Invitation from the platform administrator          |
| Hospital staff         | Clinical and front-desk work in their own hospital and branches                                               | Invitation from their hospital administrator        |

## Production configuration

Backend-only (BMAX Docker environment for the API container; never in Vercel, never prefixed `VITE_`):

| Variable                                                                               | Value / notes                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `APP_BASE_URL`                                                                         | `https://thelumenhealth.vercel.app`. Required for invitation links; without it invitations show "not sent"          |
| `EMAIL_DRIVER`                                                                         | `smtp`. (`log`/`memory` are refused in production; `disabled` means no invitation email is ever delivered)          |
| `EMAIL_FROM`                                                                           | e.g. `LumenHealth <no-reply@your-domain>`; must be a sender your provider allows                                    |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE`                                                  | Provider settings. 587 + `SMTP_SECURE=false` (STARTTLS) or 465 + `SMTP_SECURE=true`                                 |
| `SMTP_USER` `SMTP_PASSWORD`                                                            | Provider credentials: secrets, from the BMAX secret store / env file with restricted permissions                    |
| `INVITATION_TTL_HOURS`                                                                 | Optional, default `168`                                                                                             |
| `WEB_ORIGINS`, `TRUST_PROXY=true`, `SESSION_COOKIE_SECURE=true`, `NODE_ENV=production` | Already required; `TRUST_PROXY` makes rate limits and audit IPs use the real client address behind Caddy/Cloudflare |

Public frontend (Vercel): **no new variables.** The existing `vercel.json` rewrite of `/api/*` to `https://gateway.sandbox.name.ng/lumenhealth/api/*` carries the new endpoints unchanged, and `/accept-invitation` and `/platform` are client-side routes served by the SPA fallback. Deploy the frontend with the Vercel CLI as before; no GitHub integration is needed.

Email needs an SMTP provider you control (Postmark, SES, Resend's SMTP, Mailgun, or your own relay). Verify the sending domain (SPF/DKIM) or invitations will land in spam.

## Safe deployment order

1. **Back up** the production database (see [backup-and-recovery.md](backup-and-recovery.md)) and confirm the backup restores.
2. **Review the migration** `apps/api/prisma/migrations/20261125100000_multi_hospital_onboarding/migration.sql`. It is additive: new columns (`users.platformRole`, `organizations.status`/`suspendedAt`), nullable `sessions.membershipId/branchId`, two new tables. It does not delete, rewrite or re-grant existing data and touches no RLS policy.
3. **Apply it with the schema-owner connection**, from a checkout of this commit on a machine that can reach the database (the runtime image does not ship the Prisma CLI). Never `db:reset`, never the seed:

   ```bash
   MIGRATION_DATABASE_URL='postgresql://lumen:<owner-password>@<db-host>:5432/<database>' pnpm --filter @lumen/api db:migrate
   ```

   Existing sessions stay valid (their membership and branch are unchanged).

4. **Add the new environment variables** to the API container's environment (above).
5. **Rebuild and restart the API** with your usual Docker procedure, then check `GET /api/v1/health/ready`.
6. **Deploy the frontend** with the Vercel CLI as you do today.
7. Provision the platform administrator, then onboard the first hospital (below).

Rolling back the application is safe at any point (older code ignores the new columns/tables). The migration itself is forward-only.

## Provision the initial platform administrator

Run once, deliberately, by an authorised operator, inside the API container so it uses the production `DATABASE_URL` (the restricted `lumen_app` role is sufficient):

```bash
docker compose exec -it api node dist/scripts/bootstrap-platform-admin.js --email you@your-domain --name "Your Name"
```

It prompts for the password without echoing it. For a non-interactive run set `PLATFORM_ADMIN_PASSWORD` in the exec environment (`docker compose exec -e PLATFORM_ADMIN_PASSWORD api …`); never pass it as an argument. The password must be at least 12 characters and is forced to change at first sign-in.

Behaviour, all verified by tests: creates exactly one administrator; running it again prints "already exists" and changes nothing; it refuses an email that already belongs to an account; two simultaneous runs create one. Do not store the initial password anywhere.

## Onboard the first hospital

1. Sign in at `https://thelumenhealth.vercel.app/login` as the platform administrator; set your own password when prompted.
2. **Hospitals → Register a hospital.** Enter the hospital name, time zone, first branch (name and code) and the first administrator's name and email. This creates the hospital, branch and invitation in one step.
3. Check the invitation status on the hospital page: **Sent** means the email went out; **Not sent** shows why (usually email settings). Fix the settings, then **Resend**.
4. The administrator opens the emailed link (valid 7 days, works once), chooses a password and signs in to their hospital and branch only.
5. The hospital page now shows "Administrator joined". The administrator adds branches/departments and invites staff under **Staff → Invite staff member** and **Invitations**.

A hospital can be **suspended** from its page: every staff member is signed out at once and cannot sign in until it is reactivated. Data is kept.

## Testing delivery without exposing tokens

- Automated tests use `EMAIL_DRIVER=memory` and read the link from the in-process outbox.
- Local development uses `EMAIL_DRIVER=log`, which prints the link to the API console. This driver is **rejected at start-up when `NODE_ENV=production`**.
- To test a real provider safely, point a staging API at the provider, register a hospital whose administrator email is your own, and revoke the invitation afterwards. Production logs never contain tokens.

## Known limitations

- Only one platform administrator can be provisioned; there is no UI to add more.
- No self-service "forgot password"; a lost password is currently an operator task.
- Invitation endpoints are rate-limited per client IP (in-memory, per API instance).
- Outbound email is sent in the request; a slow provider slows the request (10 s connection timeout) and a failure is reported, not retried automatically.
- `invitations` is not row-level-secured by design (see ADR 0011).
