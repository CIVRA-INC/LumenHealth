# ADR 0001: NestJS Module Boundaries for `apps/api`

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** LumenHealth backend maintainers
- **Related:** #1143 (epic), #1145, [migration inventory](../nestjs-migration-inventory.md)
- **Supersedes:** nothing

## Context

`apps/api` is a modular monolith. The Express version split source into
`src/modules/{auth,clinic,staff,audit}` with each module owning a `routes/`
file, a controller, a service and a repository, plus cross-cutting middleware
under `src/shared/`. Porting to NestJS keeps that split almost verbatim, with
one genuine asymmetry:

**Staff owns two Express routers mounted at different base paths.**

| Express router | Mount | Path |
| --- | --- | --- |
| `modules/staff/routes/staff.routes.ts` (`staffRouter`) | `/api/v1/staff` | `/api/v1/staff`, `/api/v1/staff/:staffId/role` |
| `modules/staff/routes/index.ts` (`invitationRouter`) | `/api/v1/staff/invitations` | `/api/v1/staff/invitations`, `…/accept`, `…/:invitationId` |

Two separate `Router()` instances, two separate files, one mount nested inside
the other's namespace — and the nesting only works because
`app.use("/api/v1/staff/invitations", …)` was registered before
`app.use("/api/v1/staff", …)`. That ordering dependency is invisible in the
module structure and would be easy to lose.

The rest of the layout maps cleanly: each `src/modules/<name>/` becomes one
NestJS feature module whose `@Controller` reproduces the mount path.

## Decision

### 1. One NestJS feature module per `src/modules/<name>/` directory

`AuthModule`, `ClinicModule`, `AuditModule` map 1:1. `AppModule` composes them.

### 2. Invitations become a sub-module of staff: `InvitationModule`

**Decision: `InvitationModule` is its own NestJS module, declared inside
`src/modules/staff/`, not a controller inside `StaffModule`, and not a
top-level `src/modules/invitations/`.**

Reasoning:

- The two routers have genuinely different dependency sets. `StaffController`
  needs `StaffService` → `StaffRepository` + `AuditService`. `InvitationController`
  needs `InvitationService` → `InvitationRepository`, and reaches sideways into
  `auth` for `identityStore`. Folding them into one module would force each
  controller to see the other's provider graph.
- Both need `AuthGuard` and `PermissionsGuard`, so the *shared* part of the
  dependency graph is small. Sharing a module to avoid a few shared providers
  trades a real coupling problem for a cosmetic one.
- `src/modules/staff/` remains the single place a reader looks for staff
  functionality. A top-level `src/modules/invitations/` would split the staff
  feature across two module roots and break the "business logic lives inside a
  module" convention in `CONTRIBUTING.md`.

This mirrors the Express file layout — `modules/staff/routes/index.ts` already
lived next to `modules/staff/routes/staff.routes.ts` — so the port is a
structural move rather than a redesign.

### 3. `/internal/audit` is a controller inside `AuditModule`, not a module

The internal audit surface (`/internal/audit/unanchored`,
`/internal/audit/anchor-result`) shares `AuditService` and `AuditRepository`
with the public audit surface. It is separated by **path** and by **guard**,
not by dependency. It therefore becomes
`InternalAuditController` inside `AuditModule` and is excluded from the global
`/api/v1` prefix (#11). Creating an `InternalAuditModule` would imply a
dependency boundary that does not exist.

### 4. Role policy and permissions live in `src/shared/`, as a `@Global()` module

`RolePolicyModule` is marked `@Global()` and exports `RolePolicyService`.
`AuthGuard`, `PermissionsGuard` and `ClinicScopeGuard` are consumed by all four
feature modules, and `PermissionsGuard` + `RequirePermissions` decorate handlers
in three of them. Keeping them in `src/shared/` (rather than duplicating under
`src/modules/auth/`) matches the `CONTRIBUTING.md` rule that shared
infrastructure lives in `src/shared/` and carries no business logic.

### 5. `auth` is the only module that does not import another feature module

`AuthModule` owns the token signer and identity repository. Every other module
imports `AuthModule` (for `AuthGuard`); nothing imports `AuthModule` for
business logic. This keeps the graph acyclic.

## Module dependency graph

```
                       ┌──────────────────┐
                       │    AppModule     │
                       └────────┬─────────┘
                                │ imports
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  AuthModule   │       │ ClinicModule  │       │  AuditModule  │
│  AuthController│      │ ClinicController│     │AuditController│
│  AuthGuard    │       │ ClinicScopeGuard    │InternalAudit   │
│               │       │               │       │  Controller   │
│ exports:      │       │ imports:      │       │               │
│  AuthGuard    │       │  AuthModule   │       │ imports:      │
└───────┬───────┘       └───────────────┘       │  AuthModule   │
        ▲                                           └──────┬────────┘
        │                                                  │ exports
        │  imports (AuthGuard)                              │ AuditService
        │                                                  ▼
        │                       ┌───────────────┐   ┌───────────────┐
        ├──────────────────────►│ StaffModule   │──►│  AuditModule  │
        │                       │StaffController│   └───────────────┘
        │                       └───────────────┘
        │
        │                       ┌────────────────────┐
        └──────────────────────►│ InvitationModule   │
                                │InvitationController│
                                └────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │  RolePolicyModule  (@Global)  ── RolePolicyService          │
  │  consumed by: AuthGuard, PermissionsGuard, every controller │
  └──────────────────────────────────────────────────────────────┘
```

Edge list:

| From | To | Via | Why |
| --- | --- | --- | --- |
| `AppModule` | `AuthModule` | module import | auth surface |
| `AppModule` | `ClinicModule` | module import | clinic surface |
| `AppModule` | `StaffModule` | module import | staff surface |
| `AppModule` | `InvitationModule` | module import | invitation surface |
| `AppModule` | `AuditModule` | module import | audit + internal audit surfaces |
| `AppModule` | `RolePolicyModule` | module import | global role policy |
| `ClinicModule` | `AuthModule` | module import | `AuthGuard` |
| `InvitationModule` | `AuthModule` | module import | `AuthGuard` |
| `AuditModule` | `AuthModule` | module import | `AuthGuard` |
| `StaffModule` | `AuditModule` | module import | `StaffService` records audit entries |
| any module | `RolePolicyModule` | `@Global()` | permission lookups |

There is deliberately **no** `AuthModule → <feature>` edge, no
`ClinicModule → StaffModule` edge, and no cycle. `StaffModule → AuditModule` is
the single feature-to-feature edge and exists because changing a staff role is a
governance-critical action that must be written to the audit log.

## Consequences

### Accepted

- `src/modules/staff/` contains two `@Module` classes. A reader scanning for
  "the staff module" finds `staff.module.ts` and `invitation.module.ts`
  side by side, matching the two Express routers that were there before.
- `StaffModule` depends on `AuditModule`, the one place where a feature module
  reaches into another. It is a real coupling: an audit-log write is part of
  the staff-role-change transaction, not an afterthought.
- The `/api/v1/staff/invitations` path is produced by
  `@Controller('staff/invitations')` in a different module from
  `@Controller('staff')`. NestJS has no mount-ordering hazard here, so the
  Express ordering dependency documented in
  [the inventory](../nestjs-migration-inventory.md#23-invitations--apiv1staffinvitations)
  disappears — but the *path* must still be spelled `staff/invitations`, not
  `invitations`. This is called out because it is the single easiest path to
  get wrong.

### Rejected

- **Invitations as a controller inside `StaffModule`.** Rejected: couples the
  two provider graphs for no benefit, and leaves no DI boundary.
- **A top-level `src/modules/invitations/`.** Rejected: splits the staff
  feature across two module roots.
- **`InternalAuditModule`.** Rejected: the internal surface shares its
  service and repository with the public one; the split is a path and guard
  split, not a dependency split.
- **Making `AuthModule` global to avoid importing it four times.** Rejected
  for now: globalizing auth would let any module resolve `AuthGuard` without a
  declared import, which hides the real dependency and makes the graph above
  untrue. Revisit if the import list grows past the four modules.

## Follow-up

- Guard composition per route — the mapping from each Express middleware chain
  in the inventory to a NestJS `@UseGuards(...)` order — is specified
  separately in #1162. This ADR fixes *module* boundaries; it does not fix
  guard ordering.
