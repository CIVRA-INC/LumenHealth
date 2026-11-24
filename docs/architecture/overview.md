# Architecture overview

```
 Browser (React SPA)                         PostgreSQL 17
 ┌──────────────────────┐   same-origin     ┌───────────────────────────────┐
 │ apps/web             │   /api/v1 (JSON)  │ roles: lumen (owner), lumen_app│
 │ React Router         │ ───────────────▶  │ RLS · triggers · constraints  │
 │ TanStack Query       │   HttpOnly cookie │ audit_events (append-only)    │
 │ @lumen/ui, contracts │                   └──────────────▲────────────────┘
 └──────────────────────┘                                  │ Prisma 7 (adapter-pg)
          ▲  Vite proxy (dev) / reverse proxy (prod)       │ one tx + set_config per request
          │                                  ┌─────────────┴───────────────┐
          └────────────────────────────────▶ │ apps/api  NestJS 12         │
                                             │ guards: throttle→origin→     │
                                             │   auth→permissions           │
                                             │ modules: identity, org,      │
                                             │  patients, scheduling,       │
                                             │  encounters, dashboard, audit│
                                             └──────────────────────────────┘
```

## Request path

1. **Throttler** (per IP), **OriginGuard** (state-changing requests must come from an allowed origin).
2. **AuthGuard** resolves the session cookie to a `RequestContext` (user, membership, organisation, timezone, role, permissions, active branch, accessible branches).
3. **PermissionsGuard** enforces `@RequirePermissions`; undeclared routes are refused. Denials are audited.
4. The controller validates input with the contract schema (`parse`), then calls its module's service.
5. The service runs inside `PrismaService.tenant(orgId, tx => …)`: a transaction with RLS context set. Reads of sensitive data and all writes append an audit row **in the same transaction**.
6. `HttpExceptionFilter` maps domain, Prisma and database-constraint errors to the error envelope.

## Conventions

- **Versioned routes:** `/api/v1/...`; OpenAPI at `/api/docs` (non-production) and `docs/api/openapi.json`.
- **Success:** the resource itself; lists are `{ items, total, page, pageSize, totalPages, hasNextPage, hasPreviousPage }` (see below); creation returns 201, commands that change state return 200 with the updated resource; deletes of drafts return the refreshed parent.
- **Pagination:** growing lists take `page`, `pageSize` (max 100, default 25), a whitelisted `sort` and `order`, and search/filters, all validated by a contract schema; filters apply before paging, ordering is deterministic (requested column, then `id`), a page beyond the last returns no rows with correct metadata, and every query is tenant-scoped. See [ADR 0010](../adr/0010-list-pagination-contract.md) and `packages/contracts/src/common.ts` (`paginationQuerySchema`, `toPage`).
- **Errors:** `{ "error": { "code", "message", "requestId", "details?" } }` with stable codes (`VALIDATION_FAILED`, `FORBIDDEN`, `INVALID_STATE_TRANSITION`, `POTENTIAL_DUPLICATE_PATIENT`, `STALE_VERSION`, `ENCOUNTER_LOCKED`, …). Validation `details.fields[]` carries per-field messages. 5xx responses never include internals; the `requestId` correlates with the server log.
- **Logging:** pino JSON; request lines carry the path only (no query string: search text can hold names), `Authorization`/`Cookie` headers are removed; no request or response bodies are logged.
- **Time:** instants UTC (`timestamptz`); org-local "today" computed with the organisation's IANA zone (`packages/contracts/src/time.ts`).
- **Concurrency:** compare-and-set updates (`status`/`version` in the `WHERE`), exclusion constraints and partial unique indexes for invariants, counters (`INSERT … ON CONFLICT`) for MRN and queue numbers.

## Frontend

React 19 + Vite 8, React Router 7, TanStack Query (server state only), React Hook Form + zod resolver, Tailwind CSS 4 with tokens and components in `packages/ui` ([design system](../development/design-system.md)). List screens hold page, size, sort, search and filters in the URL. Sessions are the only auth state; permission checks in the UI only hide controls. On a 401 every cached query is dropped and the user returns to sign-in. Patient search text is held in memory; nothing clinical is written to `localStorage`/`sessionStorage`/IndexedDB and there is no service worker.
