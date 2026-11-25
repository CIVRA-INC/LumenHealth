# ADR 0004: Static role-based permissions

**Status:** accepted · **Date:** 2026-10-23

## Decision

Four roles (`ORG_ADMIN`, `CLINICIAN`, `NURSE`, `FRONT_DESK`) map to a fixed list of permissions defined in `packages/contracts/src/permissions.ts`. Every API route must declare `@Public()`, `@Authenticated()` or `@RequirePermissions(...)`; an undeclared route is refused (secure by default). The web app hides what a role cannot do, but the API is the enforcement point.

Notable choices: administrators have **no clinical access**; only the **attending** clinician edits the note, diagnoses and prescription; nurses may record vitals but not document, prescribe or sign; denied attempts are audited.

## Consequences

Trivial to test and audit. Custom per-organisation roles can be added later as a table that resolves to the same permission names without changing any controller.
