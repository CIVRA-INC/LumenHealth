# Audit collection indexes

Index definitions live in `apps/api/src/modules/audit/repositories/audit.indexes.ts`.

| Index | Key | Serves |
| --- | --- | --- |
| `auditId_unique` | `{ auditId: 1 }` unique | lookup by id, verify, anchor results |
| `clinic_createdAt` | `{ clinicId: 1, createdAt: -1 }` | default list, range reads, export |
| `clinic_action_createdAt` | `{ clinicId: 1, action: 1, createdAt: 1 }` | list filtered by action |
| `clinic_actor_createdAt` | `{ clinicId: 1, actorId: 1, createdAt: 1 }` | list filtered by actor |
| `unanchored_createdAt` | `{ createdAt: 1 }`, partial on missing `stellarTxHash` | `findUnanchored` |

## Verifying plans

For each hot path, run `explain("executionStats")` against a collection seeded with 1M entries and
confirm the winning plan is an `IXSCAN` (no `COLLSCAN`) using the index above:

```js
db.audit_entries.find({ clinicId }).sort({ createdAt: -1 }).limit(50).explain("executionStats");
db.audit_entries.find({ clinicId, action }).sort({ createdAt: 1 }).explain("executionStats");
db.audit_entries.find({ stellarTxHash: { $exists: false } }).sort({ createdAt: 1 }).explain("executionStats");
```

Record the plans and timings here when the database-backed repository lands.

## Index builds on large collections

Build the partial `unanchored_createdAt` index first, then the compound indexes one at a time during a
low-traffic window.
