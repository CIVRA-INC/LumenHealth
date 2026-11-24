# Offline readiness and the planned facility-local model

**Status: architecture note only. No offline capability exists.** Caching pages with a service worker is not offline operation and is deliberately not used.

## Goal

A hospital continues registering patients, scheduling, documenting and prescribing across several computers on its LAN while the internet is down, then converges with the cloud.

## What is already true (so this is not a rewrite later)

- UUIDv7 ids (no central id allocator); `organizationId`, `branchId` ownership on rows; `version` + `updatedAt` on mutable aggregates; UTC instants; no sensitive data in browser storage.
- Business invariants live in PostgreSQL (constraints, triggers) so a facility-local PostgreSQL enforces the same rules.
- The payment provider interface is independent of connectivity (`payments.md`).

## Planned model

```
 workstations ──LAN──▶ facility server (same API + PostgreSQL) ◀──sync──▶ cloud
```

- The facility server runs the **same API image** against a local PostgreSQL; workstations point at it. Cloud and facility server each hold an authoritative copy for their organisation/branch.
- **Ownership:** a branch's operational data (appointments, queue, encounters) is written only by that branch's facility server → conflict-free by construction. The shared patient registry is the only multi-writer area.
- **Change tracking:** an append-only change log per table (entity, id, version, operation, origin node, hybrid logical clock), written in the same transaction as the change; replicated in order with acknowledgement and idempotent apply.
- **Conflicts:** registry edits use per-field last-writer-wins by HLC for demographics; duplicate registrations offline are reconciled by the existing duplicate rules plus a merge workflow (to be designed); clinical documents are never merged (signed content is immutable; addenda append).
- **Identifiers needing coordination:** MRN. Use per-node number blocks or provisional ids reconciled on sync.
- **Sessions/auth offline:** facility server validates credentials locally (replicated, hashed); sessions are local.

## Operations that always require online verification or external services

Payment settlement verification (Stellar Horizon, card/bank providers), anything touching external identity or terminology services, email/SMS, remote support. **A payment must never be shown as settled without authoritative verification**; offline, the UI may record "payment pending verification" only.

## Acceptance tests required before claiming offline support

Multiple connected computers; interrupted connectivity (mid-write); duplicate operations (replays); conflicting edits; restart and crash recovery of both sides; eventual convergence verified by comparing both databases.
