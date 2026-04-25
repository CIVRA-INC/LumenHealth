# CHORD-031 – Authoritative MongoDB Data Model Plan

**Status:** Accepted  
**Sprint:** 1 – Reset, repo foundation, and core backend baseline  
**Replaces:** Any Prisma prototype or informal schema notes

---

## 1. Decision: Mongoose as the primary ODM

The codebase already uses **Mongoose 9** throughout `apps/api/src/modules/*/models/`.
There is no Prisma schema file in the repository; the "Prisma prototype" referenced in
the issue title refers to an earlier planning artefact that was never committed.

**Resolution:** Mongoose + MongoDB is the single authoritative data layer.
No Prisma dependency will be introduced. All schema definitions live in
`apps/api/src/modules/<domain>/models/<name>.model.ts`.

---

## 2. Canonical collection inventory

| Collection | Model file | Primary key | Notes |
|---|---|---|---|
| `users` | `modules/auth/models/user.model.ts` | `_id` (ObjectId) | Clinic staff; see CHORD-032 for fan/artist/admin extension |
| `clinics` | `modules/clinics/models/clinic.model.ts` | `_id` | Tenant root |
| `patients` | `modules/patients/models/patient.model.ts` | `_id` | Scoped to `clinicId` |
| `patient_counters` | `modules/patients/models/patient-counter.model.ts` | `clinicId` | Auto-increment sequence |
| `encounters` | `modules/encounters/models/encounter.model.ts` | `_id` | Append-only; never deleted |
| `vitals` | `modules/vitals/models/vitals.model.ts` | `_id` | One doc per reading |
| `clinical_notes` | `modules/notes/models/clinical-note.model.ts` | `_id` | Immutable after creation |
| `diagnoses` | `modules/diagnoses/models/diagnosis.model.ts` | `_id` | ICD-10 linked |
| `icd10_codes` | `modules/diagnoses/models/icd10-code.model.ts` | `_id` | Reference data |
| `payment_records` | `modules/payments/models/payment-record.model.ts` | `_id` | Stellar tx log |
| `queue_encounters` | `modules/queue/models/queue-encounter.model.ts` | `_id` | Ephemeral queue state |
| `audit_logs` | `modules/audit/models/audit-log.model.ts` | `_id` | Append-only |
| `ai_drafts` | `modules/ai/models/ai-draft.model.ts` | `_id` | Gemini output cache |
| `clinical_alerts` | `modules/ai/models/clinical-alert.model.ts` | `_id` | CDS worker output |

---

## 3. Index strategy

### 3.1 Required indexes (enforce at schema level)

```
users:            { email: 1 }  unique
                  { clinicId: 1, isActive: 1 }
                  { resetPasswordExpiresAt: 1 }  sparse TTL candidate

patients:         { clinicId: 1, systemId: 1 }  unique
                  { clinicId: 1, lastName: 1, firstName: 1 }  search

encounters:       { clinicId: 1, status: 1, openedAt: -1 }
                  { patientId: 1, openedAt: -1 }

vitals:           { encounterId: 1, timestamp: -1 }

clinical_notes:   { encounterId: 1, timestamp: -1 }

diagnoses:        { encounterId: 1 }

audit_logs:       { clinicId: 1, createdAt: -1 }
                  { actorId: 1, createdAt: -1 }

queue_encounters: { clinicId: 1, status: 1 }  (covered by existing model)

payment_records:  { clinicId: 1, status: 1 }
                  { stellarTxHash: 1 }  sparse unique
```

### 3.2 Index creation policy

- All indexes are declared in the Mongoose schema definition (`index: true` or
  `schema.index({...})`).
- `ensureIndexes()` is called once at application startup via `connectDB()`.
- Background index builds (`{ background: true }`) are used for collections that
  may already contain data in production.

---

## 4. Read and write paths

### 4.1 Write paths

| Operation | Collection | Constraints |
|---|---|---|
| Clinic registration | `clinics`, `users` | Atomic via session if replica set available |
| Patient registration | `patients`, `patient_counters` | `findOneAndUpdate` with `$inc` for `systemId` |
| Encounter open | `encounters` | Status must be `OPEN` on creation |
| Encounter close | `encounters` | `findOneAndUpdate` with status guard |
| Vitals record | `vitals` | Encounter must be `IN_PROGRESS` |
| Note creation | `clinical_notes` | Immutable; no update path |
| Audit log | `audit_logs` | Fire-and-forget; never blocks request |

### 4.2 Read paths

| Query | Collection | Index used |
|---|---|---|
| Patient search | `patients` | `{ clinicId, lastName, firstName }` |
| Patient timeline | `encounters` | `{ patientId, openedAt }` |
| Queue board | `queue_encounters` | `{ clinicId, status }` |
| Encounter vitals | `vitals` | `{ encounterId, timestamp }` |
| Encounter notes | `clinical_notes` | `{ encounterId, timestamp }` |
| Audit trail | `audit_logs` | `{ clinicId, createdAt }` |

---

## 5. Ownership boundaries

- Every document that belongs to a clinic **must** carry a `clinicId` field.
- Service-layer functions **must** scope all queries with `{ clinicId }` from the
  authenticated request context (`getRequestContext(req).clinicId`).
- Cross-clinic reads are only permitted for `SUPER_ADMIN` role.
- `patients` and `encounters` are never hard-deleted; use `isActive: false` or
  `status: CLOSED`.

---

## 6. Migration rules

1. **Additive changes only** in production: add fields with defaults, never rename
   or remove without a migration script.
2. Migration scripts live in `apps/api/scripts/` and are named
   `migrate-<YYYYMMDD>-<description>.cjs`.
3. Each migration must be idempotent (safe to run twice).
4. Schema version is tracked in the `clinics` document as `schemaVersion: number`.

---

## 7. Validation layer

Runtime validation uses **Zod** schemas in `*.validation.ts` files.
Mongoose schemas provide a second layer of enforcement at the database driver level.
The two layers must stay in sync; when a Mongoose schema field changes, the
corresponding Zod schema must be updated in the same PR.

---

## 8. Future considerations

- **Replica set / transactions:** The current dev setup uses a standalone MongoDB
  instance. Multi-document transactions require a replica set. The code is written
  to be transaction-ready (session parameter threading) but does not require it.
- **Time-series collections:** `vitals` is a candidate for MongoDB time-series
  collections once the data volume justifies it.
- **Atlas Search:** `patients` search currently uses a regex index. Atlas Search
  (or a local `$text` index) should replace this before the patient count exceeds
  ~100k per clinic.
