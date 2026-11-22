# Auth RBAC

This document describes the current role-based access control model in `apps/api`.

## Source of truth

- Role/permission types: `packages/types/src/auth.ts` (`UserRole`, `Permission`, `RolePolicy`)
- Permission matrix: `apps/api/src/shared/role-policy/role-policy.service.ts`
- Permission guard: `apps/api/src/shared/guards/permissions.guard.ts`
- Permission decorator: `apps/api/src/shared/decorators/permissions.decorator.ts`
- Clinic scope guard: `apps/api/src/modules/clinic/guards/clinic-scope.guard.ts`

## Roles

`UserRole` values are defined in `@lumen/types`:

| Role | Description |
|---|---|
| `owner` | Clinic owner; highest clinic privilege. |
| `admin` | Administrative staff; permissions per policy matrix. |
| `clinician` | Clinical staff with patient-care access. |
| `cashier` | Billing-focused staff. |
| `system` | Internal/system actor; no user-facing permission grants by default. |

## Permission matrix

The matrix below mirrors `RolePolicyService.rolePolicies`.

| Permission | owner | admin | clinician | cashier | system |
|---|---:|---:|---:|---:|---:|
| `auth:read` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `auth:write` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `billing:read` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `billing:write` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `patient:read` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `patient:write` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `clinic:read` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `clinic:write` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `staff:read` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `staff:write` | ✅ | ✅ | ❌ | ❌ | ❌ |

## Enforcement notes

- `PermissionsGuard` reads required permissions from `@RequirePermissions(...)` metadata and checks the caller role through `RolePolicyService`. Missing auth context returns `401 AUTH_UNAUTHORIZED`; insufficient permissions return `403 AUTH_FORBIDDEN`.
- `ClinicScopeGuard` enforces clinic isolation for routes that declare clinic scope.
- Some routes may also include route-specific checks; when adding/changing authorization, prefer `RolePolicyService` + guards as the single source of truth.

## Ownership bootstrap

Clinic ownership bootstrap is an application flow concern. The first verified/created clinic owner should receive the `owner` role; subsequent staff should be invited/assigned through staff/invitation flows with appropriate permission checks.

## Authorization logging

Authorization denials and elevated/admin actions should be logged with actor role, clinic/user identifiers where appropriate, target resource, and decision reason, following existing auth/audit logging patterns.
