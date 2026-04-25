# Data Ownership Boundaries

> Version: 1.0.0 — CHORD-015
> Owner: Architecture & Standards
> Review trigger: new data store, change to source-of-truth assignment, or cross-store consistency requirement

---

## Purpose

This document defines which data store owns each category of application state. "Owns" means that store is the authoritative source of truth — reads for that data should ultimately derive from it, and writes must go through it first. Violating these boundaries creates consistency bugs and makes audits unreliable.

---

## Data Stores in Use

| Store | Role | Location |
|---|---|---|
| **MongoDB** | Primary persistent store for all clinical and operational data | `apps/api` via Mongoose |
| **Blockchain (Stellar)** | Immutable ledger for payment transactions | `apps/stellar-service` via Stellar SDK |

> Redis is not currently deployed. This document will be updated when a caching layer is introduced. See the [Future: Redis](#future-redis) section for the planned ownership model.

---

## MongoDB — Owned Data

MongoDB is the source of truth for all of the following:

### Clinical Records

| Entity | Collection | Notes |
|---|---|---|
| Patients | `patients` | Demographics, clinic-scoped |
| Encounters | `encounters` | Append-only lifecycle records |
| Vitals | `vitals` | Sub-resource of encounters |
| Notes | `notes` | Immutable after submission |
| Diagnoses | `diagnoses` | ICD-10 coded, encounter-scoped |

### Identity and Access

| Entity | Collection | Notes |
|---|---|---|
| Users | `users` | Staff accounts, hashed credentials |
| Clinics | `clinics` | Organization registration |
| Refresh tokens | `refreshTokens` | Stored for revocation; access tokens are stateless |

### Payments (off-chain state)

| Entity | Collection | Notes |
|---|---|---|
| Payment intents | `paymentIntents` | Pre-transaction state, transitions to confirmed/expired |
| Subscriptions | `subscriptions` | Billing status, gates feature access |

### Audit

| Entity | Collection | Notes |
|---|---|---|
| Audit logs | `auditLogs` | Append-only, never deleted |

### AI

| Entity | Collection | Notes |
|---|---|---|
| AI prompt logs | `aiLogs` | Optional; used for debugging and compliance review |

---

## Blockchain (Stellar) — Owned Data

The Stellar ledger is the source of truth for:

| Data | Notes |
|---|---|
| Payment finality | Whether a payment actually settled on-chain |
| Transaction hash | Canonical proof of payment; stored in `paymentIntents` as a reference |
| XLM / asset balances | Live balances are read from the network, not cached locally |

**Rule:** The API must never treat a `paymentIntent` as confirmed without verifying the transaction hash against the Stellar network via `apps/stellar-service`. MongoDB stores the *reference* (`stellarTxHash`) and the *derived status* (`confirmed`), but the ledger is the authority.

---

## Derived / Computed State

Some data is derived from owned records and does not have its own authoritative store:

| Derived Data | Derived From | Where Computed |
|---|---|---|
| Queue board | Open encounters in MongoDB | `apps/api` at query time, streamed via SSE |
| Visit summary (AI) | Encounter + vitals + notes | `apps/api/src/modules/ai`, not persisted by default |
| CDS output | Encounter context | Streamed, not persisted |
| Subscription gate result | `subscriptions` collection | Evaluated in middleware at request time |

---

## Cross-Store Consistency Rules

1. **Payment confirmation flow:** Write `paymentIntent.status = confirmed` to MongoDB only after `apps/stellar-service` confirms the transaction hash on-chain. Never confirm based on client assertion alone.

2. **Audit log integrity:** Audit logs in MongoDB must be written in the same request context as the mutating operation. Do not defer audit writes to background jobs — if the audit write fails, the mutation should be rolled back or flagged.

3. **Encounter append-only rule:** Encounters in MongoDB are never hard-deleted. Soft-delete or status transitions are the only permitted mutations after creation.

4. **Refresh token revocation:** Deleting a refresh token from MongoDB is the revocation mechanism. The access token remains valid until expiry — keep access token TTL short (15 minutes).

---

## Workspace Ownership

| Store | Accessing Workspace | Access Pattern |
|---|---|---|
| MongoDB | `apps/api` only | Mongoose models in `src/modules/<domain>/<domain>.repository.ts` |
| Stellar ledger | `apps/stellar-service` only | Stellar SDK; `apps/api` calls `stellar-service` via HTTP |
| MongoDB (read-only analytics) | `contrib/clinic-ops-sandbox` | Direct read-only connection; never writes |

`apps/web` and `apps/stellar-service` must not import Mongoose models or connect to MongoDB directly.

---

## Future: Redis

When Redis is introduced, the planned ownership model is:

| Data | Redis Role | TTL |
|---|---|---|
| Session rate-limit counters | Ephemeral counter | 1 minute |
| Queue board snapshot | Read-through cache in front of MongoDB | 5 seconds |
| Leaderboard / analytics aggregates | Derived cache | 60 seconds |
| Distributed lock (payment dedup) | Mutex | Duration of payment flow |

Redis will **not** own any data that requires durability or audit. All Redis data is considered ephemeral and reconstructible from MongoDB.

---

## Review Checklist

When adding a new data store or changing ownership:

- [ ] Update this document with the new store and its owned data
- [ ] Update `docs/contributor-architecture-handbook.md` if workspace access patterns change
- [ ] Add a boundary check if a new workspace gains access to a store
- [ ] Confirm cross-store consistency rules are documented for any new write flow
- [ ] ADR required if the change affects PHI handling or audit retention
