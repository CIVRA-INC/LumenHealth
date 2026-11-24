# ADR 0005: Tenant isolation and audit

**Status:** accepted · **Date:** 2026-10-23

## Decision (layers, outermost first)

1. **Authorisation scope.** The request context (organisation, branch, role) is derived from the session, never from client input. Resources outside the caller's organisation return **404**, not 403, so existence is not revealed.
2. **Query scoping.** Every service query filters by `organizationId` (and branch where relevant).
3. **Row-level security.** All tenant tables have RLS policies keyed on `app.current_org_id`. The API runs as the non-owner role `lumen_app` and only reaches tenant data through `PrismaService.tenant()`, which opens a transaction and sets the setting with `set_config(..., true)`. With no context, no rows are visible; writes into another tenant are rejected by `WITH CHECK`.
4. **Structural constraints.** Child rows reference parents through composite foreign keys including `organizationId` (and `patientId` for clinical rows), so cross-tenant and cross-patient links are impossible even for the schema owner.
5. **Roles.** `lumen` (owner) runs migrations/seed and bypasses RLS; `lumen_app` has least-privilege grants (no `DELETE` on clinical tables except removable drafts; audit is insert/select only).

Not under RLS: users, sessions, memberships, branches, organisations. Authentication needs them before a tenant context exists; they contain no clinical data.

## Audit

`audit_events` is append-only (privilege revoked + trigger that also stops the owner). Rows are written in the same transaction as the change. Metadata holds identifiers and counts only. Search text and clinical content are never recorded.

## Limits

RLS protects against application bugs, not against an attacker who can run arbitrary SQL as `lumen_app` (they could set the GUC). Pair with network isolation and credential hygiene. See `architecture/security-model.md`.
