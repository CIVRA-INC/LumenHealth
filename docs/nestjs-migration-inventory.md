# Express → NestJS Migration Inventory

Source of truth for the Express → NestJS migration tracked by #1143.

This document enumerates every route the Express application exposed, the
controller/service/repository files behind it, and every Express-specific API
the handler bodies relied on. During the port each entry is annotated with its
NestJS destination so the route table can be diffed for parity.

- **Express baseline commit:** `191a7bf` (last commit before the NestJS
  migration series started).
- **NestJS status recorded against:** `af90174` (`develop`).
- **Scope:** `apps/api/src/app.ts`, `apps/api/src/server.ts`, and
  `apps/api/src/modules/{auth,clinic,staff,audit}`.

Related: module boundary decision in
[ADR 0001](./adr/0001-nestjs-module-boundaries.md).

---

## 1. Mount table

`apps/api/src/app.ts` mounted six routers plus one inline handler. Every mount
path below is a public contract and must not change during the port.

| Mount path | Router | Router file (Express) |
| --- | --- | --- |
| `/health` | inline handler in `app.ts` | `apps/api/src/app.ts` |
| `/api/v1/auth` | `authRouter` | `modules/auth/routes/index.ts` |
| `/api/v1/staff/invitations` | `invitationRouter` | `modules/staff/routes/index.ts` |
| `/api/v1/staff` | `staffRouter` | `modules/staff/routes/staff.routes.ts` |
| `/api/v1/clinics` | `clinicRouter` | `modules/clinic/routes/index.ts` |
| `/api/v1/audit` | `auditRouter` | `modules/audit/routes/index.ts` |
| `/internal/audit` | `internalAuditRouter` | `modules/audit/routes/internal.ts` |

Two properties of this table are load-bearing and are the reason several
migration issues exist:

1. **`/internal/audit` sits outside `/api/v1`.** It is the service-to-service
   surface consumed by `apps/stellar-service` and is not part of the versioned
   public API. A single global prefix therefore has to exclude it (#11).
2. **`/health` also sits outside `/api/v1`.** External uptime checks poll the
   root path, so the global prefix must exclude it too (#9, #11).

`apps/api/src/server.ts` read `serverConfig.apiPort` from `@lumen/config` and
logged exactly:

```text
LumenHealth API running on http://localhost:${port}
```

---

## 2. Route inventory

Guard/middleware column reproduces the Express chain verbatim. `—` means the
route was public.

### 2.1 Health

| Method | Path | Handler | Middleware chain |
| --- | --- | --- | --- |
| GET | `/health` | inline in `app.ts` | — |

Response shape (must stay byte-for-byte compatible):

```json
{ "service": "api", "status": "ok", "milestone": "staff-invitations" }
```

Files: `apps/api/src/app.ts` (`app.get("/health", …)`).

### 2.2 Auth — `/api/v1/auth`

Router file: `modules/auth/routes/index.ts`. Controller:
`modules/auth/controllers/auth.controller.ts`.

| Method | Path | Handler | Middleware chain |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | `register` | — |
| POST | `/api/v1/auth/login` | `login` | — |
| POST | `/api/v1/auth/logout` | `logout` | — |
| POST | `/api/v1/auth/refresh` | `refresh` | — |
| POST | `/api/v1/auth/password-reset/request` | `passwordResetRequest` | — |
| POST | `/api/v1/auth/password-reset/confirm` | `passwordResetConfirm` | — |
| POST | `/api/v1/auth/verify/request` | `verifyRequest` | — |
| POST | `/api/v1/auth/verify/complete` | `verifyComplete` | — |
| GET | `/api/v1/auth/metrics` | `metrics` | — |
| GET | `/api/v1/auth/me` | `me` | `resolveAuthContext` |
| GET | `/api/v1/auth/owner-only` | `ownerOnly` | `resolveAuthContext` |

The router also ended with `router.use(errorHandler)` — a router-scoped
catch-all that became the global exception filter (#48).

Supporting files: `modules/auth/services/token.service.ts`,
`modules/auth/services/account-status.service.ts`,
`modules/auth/services/metrics.service.ts`,
`modules/auth/repositories/identity.repository.ts`,
`modules/auth/repositories/session.repository.ts`,
`shared/middleware/auth-context.ts`.

### 2.3 Invitations — `/api/v1/staff/invitations`

Router file: `modules/staff/routes/index.ts`. Controller:
`modules/staff/controllers/invitation.controller.ts`.

| Method | Path | Handler | Middleware chain |
| --- | --- | --- | --- |
| POST | `/api/v1/staff/invitations` | `send` | `resolveAuthContext` |
| GET | `/api/v1/staff/invitations` | `list` | `resolveAuthContext` |
| POST | `/api/v1/staff/invitations/accept` | `accept` | — |
| DELETE | `/api/v1/staff/invitations/:invitationId` | `revoke` | `resolveAuthContext` |

Note the mount-order sensitivity: `app.use("/api/v1/staff/invitations", …)` is
registered **before** `app.use("/api/v1/staff", …)` so invitation paths are not
swallowed by the staff router. Any NestJS module split must preserve the
resulting paths exactly.

Supporting files: `modules/staff/services/invitation.service.ts`,
`modules/staff/repositories/invitation.repository.ts`,
`shared/decorators/permissions.decorator.ts`,
`shared/guards/permissions.guard.ts`.

### 2.4 Staff — `/api/v1/staff`

Router file: `modules/staff/routes/staff.routes.ts`. Controller:
`modules/staff/controllers/staff.controller.ts`.

| Method | Path | Handler | Middleware chain |
| --- | --- | --- | --- |
| GET | `/api/v1/staff` | `list` | `resolveAuthContext` |
| PATCH | `/api/v1/staff/:staffId/role` | `updateRole` | `resolveAuthContext` |

Supporting files: `modules/staff/services/staff.service.ts`,
`modules/staff/repositories/staff.repository.ts`.

### 2.5 Clinic — `/api/v1/clinics`

Router file: `modules/clinic/routes/index.ts`. Controller:
`modules/clinic/controllers/clinic.controller.ts`.

| Method | Path | Handler | Middleware chain |
| --- | --- | --- | --- |
| POST | `/api/v1/clinics` | `create` | `resolveAuthContext` |
| GET | `/api/v1/clinics/:clinicId` | `get` | `resolveAuthContext`, `requireClinicScope("clinicId")` |
| PATCH | `/api/v1/clinics/:clinicId` | `update` | `resolveAuthContext`, `requireClinicScope("clinicId")` |
| DELETE | `/api/v1/clinics/:clinicId` | `archive` | `resolveAuthContext`, `requireClinicScope("clinicId")` |

`requireClinicScope` is only present on the three `:clinicId` routes, and it
passes through when the param is absent (see §4).

Supporting files: `modules/clinic/services/clinic.service.ts`,
`modules/clinic/repositories/clinic.repository.ts`,
`modules/clinic/validators/clinic.validator.ts`,
`shared/middleware/clinic-scope.ts`.

### 2.6 Audit — `/api/v1/audit`

Router file: `modules/audit/routes/index.ts`. Controller:
`modules/audit/controllers/audit.controller.ts`.

| Method | Path | Handler | Middleware chain |
| --- | --- | --- | --- |
| GET | `/api/v1/audit` | `list` | `resolveAuthContext` |
| GET | `/api/v1/audit/export` | `exportAuditLog` | `resolveAuthContext` |
| GET | `/api/v1/audit/anchoring-health` | `anchoringHealth` | `resolveAuthContext` |
| GET | `/api/v1/audit/:auditId/verify` | `verify` | `resolveAuthContext` |
| POST | `/api/v1/audit/verify-export` | `verifyExport` | — (public) |

`POST /api/v1/audit/verify-export` is deliberately unauthenticated: a third
party re-verifying an exported compliance bundle has no LumenHealth account.
It is also the one route with a raised body limit (§3).

Supporting files: `modules/audit/services/audit.service.ts`,
`modules/audit/services/stellar-verifier.client.ts`,
`modules/audit/repositories/audit.repository.ts`.

### 2.7 Internal audit — `/internal/audit`

Router file: `modules/audit/routes/internal.ts`. Controller:
`modules/audit/controllers/internal-audit.controller.ts`. Guard:
`modules/audit/guards/internal-service-token.guard.ts` (Express form:
`requireInternalServiceToken`).

| Method | Path | Handler | Middleware chain |
| --- | --- | --- | --- |
| GET | `/internal/audit/unanchored` | `listUnanchored` | `requireInternalServiceToken` |
| POST | `/internal/audit/anchor-result` | `submitAnchorResult` | `requireInternalServiceToken` |

`requireInternalServiceToken` was applied with `router.use(...)`, i.e. it
covered the whole router rather than individual routes. The NestJS equivalent is
a controller-level guard, not per-method.

---

## 3. Body-parser configuration

`app.ts` registered two JSON parsers, and the order was significant:

```ts
app.use("/api/v1/audit/verify-export", express.json({ limit: "5mb" }));
app.use(express.json());
```

Export bundles carry many audit entries plus Merkle proofs, so this one path
gets a 5 MB limit while the app-wide default stays at body-parser's 100 kB.

The ordering comment in the source is worth preserving verbatim in the NestJS
equivalent: body-parser skips re-parsing a request whose body a previous
middleware already consumed, so registration order is what makes the larger
limit take effect for that one route. Tracked by #10.

---

## 4. Express-specific API surface

Everything below had to be replaced or re-expressed by the NestJS equivalents.

| Express API | Where | NestJS replacement | Issue |
| --- | --- | --- | --- |
| `Router()` + `router.get/post/patch/delete` | all `modules/*/routes/*` | `@Controller()` + `@Get/@Post/@Patch/@Delete` | #3 |
| `app.use("/prefix", router)` | `app.ts` | `app.setGlobalPrefix(...)` | #11 |
| `(req, res, next)` handler signature | all route handlers | controller method params | #3 |
| `res.json(payload)` | all route handlers | return value from handler | #28 |
| `res.status(n).json(payload)` | all route handlers | `HttpException` or `@Res({ passthrough: true })` | #28 |
| `req.params[paramName]` | `shared/middleware/clinic-scope.ts` | `@Param()` / `Reflector` metadata | #18 |
| `req.query.x` | `audit.controller.ts`, `invitation.controller.ts` | `@Query()` | #24 |
| `req.body` | most handlers | `@Body()` + DTO + pipe | #4, #12 |
| `req.headers.authorization` | `shared/middleware/auth-context.ts` | `@Headers()` inside `AuthGuard` | #17 |
| `req.header("x-internal-service-token")` | internal audit guard | `@Headers()` inside `InternalServiceTokenGuard` | #23 |
| `req.ip` | auth handlers (rate limiting) | `@Ip()` | #39 |
| `req.auth` mutation + module augmentation | `shared/middleware/auth-context.ts` | `@AuthContext()` param decorator | #21 |
| `next()` | all middleware | `true` from `CanActivate` | #17, #18, #19 |
| `router.use(errorHandler)` | `modules/auth/routes/index.ts` | global exception filter | #48 |
| `app.get("/health", …)` inline handler | `app.ts` | `HealthController` | #9 |
| `express.json({ limit })` ordering | `app.ts` | scoped `bodyParser` via `app.use()` | #10 |
| `app.listen(port, cb)` | `server.ts` | `app.listen(port)` from `NestFactory` | #7 |
| `process.env.*` direct reads | `token.service.ts` | `@lumen/config` provider | #8 |
| Router-scoped middleware (`router.use`) | internal audit router | controller-level `@UseGuards` | #20 |

---

## 5. NestJS port status

Recorded against `develop` at `af90174`.

| Express artifact | NestJS destination | Status |
| --- | --- | --- |
| `app.ts` mounts | `app.module.ts` + `app.setGlobalPrefix` | done |
| `auth.routes` | `modules/auth/controllers/auth.controller.ts` (`@Controller('auth')`) | done |
| `invitation.routes` | `modules/staff/controllers/invitation.controller.ts` (`@Controller('staff/invitations')`) | done |
| `staff.routes` | `modules/staff/controllers/staff.controller.ts` (`@Controller('staff')`) | done |
| `clinic.routes` | `modules/clinic/controllers/clinic.controller.ts` (`@Controller('clinics')`) | done |
| `audit.routes` | `modules/audit/controllers/audit.controller.ts` (`@Controller('audit')`) | done |
| `internal.routes` | `modules/audit/controllers/internal-audit.controller.ts` (`@Controller('internal/audit')`) | done |
| `resolveAuthContext` | `modules/auth/guards/auth.guard.ts` | done |
| `requireClinicScope` | `modules/clinic/guards/clinic-scope.guard.ts` | partial — param name is hard-coded |
| `requirePermission` | `shared/guards/permissions.guard.ts` | done |
| `/health` inline handler | — | not yet ported to a controller (#9) |

Path parity for the ten `/api/v1` routes plus the two `/internal/audit` routes
and `/health` is unchanged. Two behavioural gaps remain and are tracked
separately: the body-parser limit for `/api/v1/audit/verify-export` (#10) and
the un-prefixed `/health` route (#9).

---

## 6. Parity checklist

Use this list when diffing the Express baseline against a candidate NestJS
release. The Express surface is **29 routes**: 1 health + 11 auth + 4
invitations + 2 staff + 4 clinic + 5 audit + 2 internal audit.

- [x] Route count reconciles: 1 + 11 + 4 + 2 + 4 + 5 + 2 = 29.
- [x] Every Express mount path reappears verbatim in a NestJS `@Controller`.
- [x] `/health` and `/internal/audit` remain outside `/api/v1`.
- [x] `POST /api/v1/audit/verify-export` remains unauthenticated.
- [x] `POST /api/v1/staff/invitations/accept` remains unauthenticated.
- [x] `requireClinicScope` remains attached only to the three `clinics/:clinicId` routes.
- [x] `requireInternalServiceToken` covers the whole internal audit router.
- [ ] 5 MB body limit on `/api/v1/audit/verify-export` — #10.
- [ ] `/health` served by a NestJS controller — #9.
- [ ] `requireClinicScope` param name configurable via decorator metadata — #18.

**`POST /api/v1/auth/register`.** This is the one entry in §2.2 with no
`AuthController` counterpart in the NestJS port. It is retained in this
inventory because it was part of the Express public surface and dropping it
silently would itself be a parity break. The remaining 28 routes have NestJS
handlers.
