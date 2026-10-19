# ADR 0003: Persistence strategy for the API

- **Status:** Accepted
- **Related:** [ADR 0001](0001-nestjs-module-boundaries.md), [ADR 0002](0002-critical-audit-actions.md)

## Context

`identityStore`, `sessionStore`, `clinicStore`, the staff and invitation stores and `auditStore`
are module-level `Map`s. A restart loses every account and audit entry, and two instances
disagree. The repository labels and older issues assume MongoDB; this ADR confirms that choice
against Postgres.

## Decision

Use **MongoDB** (replica set) as the system of record.

| Need | MongoDB | Postgres |
| --- | --- | --- |
| Expiring sessions and tokens | Native TTL indexes on `expiresAt` | Needs a cleanup job |
| Append-only audit | Insert-only DB role plus schema validation; anchor fields set once via conditional update | Triggers or row-level security |
| Multi-document invariants (clinic + owner, last owner) | Transactions on a replica set, or single-document conditional updates | Native transactions |
| Document-shaped records (audit `before`/`after`, Merkle proofs) | Native | JSONB |
| Fit with existing labels and issues | Matches | Would need rework |

Postgres is the credible alternative if relational reporting becomes a requirement. It is rejected
for now because TTL indexes and document-shaped audit entries remove the most code, and the
backlog already assumes MongoDB.

Services depend on repository interfaces, with the in-memory implementation kept for tests and
exercised by the same contract suite as the database implementation.

## Migration order

1. Identity
2. Sessions
3. Clinic
4. Staff
5. Invitations
6. Audit

Each step ships behind its repository interface, so the in-memory implementation stays available
until the next step lands.
