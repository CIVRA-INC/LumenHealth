# CHORD-040 — Database Indexing Review

## Load Assumptions (Sprint 1 Baseline)

| Metric | Assumption |
|---|---|
| Concurrent users | ≤ 500 |
| Daily active supporters | ≤ 5 000 |
| Audit events / day | ≤ 50 000 |
| Reputation updates / day | ≤ 20 000 |
| Patients / clinic | ≤ 10 000 |
| Read : Write ratio | ~80 : 20 |

---

## Collection Index Inventory

### `users`

| Index | Fields | Type | Rationale |
|---|---|---|---|
| `email_1` | `{ email: 1 }` | unique | Login lookup — every auth request |
| `clinicId_1_isActive_1` | `{ clinicId: 1, isActive: 1 }` | compound | List active staff per clinic |

**Query patterns**
- `findOne({ email })` — login
- `find({ clinicId, isActive: true })` — clinic staff list

---

### `clinics`

| Index | Fields | Type | Rationale |
|---|---|---|---|
| `_id` (default) | `{ _id: 1 }` | default | Lookup by clinic ID |
| `stellarWalletAddress_1` | `{ stellarWalletAddress: 1 }` | sparse | Payment reconciliation |

**Query patterns**
- `findById(clinicId)` — settings load
- `findOne({ stellarWalletAddress })` — payment webhook matching

---

### `supporterreputations`

| Index | Fields | Type | Rationale |
|---|---|---|---|
| `userId_1` | `{ userId: 1 }` | unique | Primary lookup per supporter |
| `level_-1_totalPoints_-1` | `{ level: -1, totalPoints: -1 }` | compound | Leaderboard queries |
| `totalPoints_1` | `{ totalPoints: 1 }` | single | Range queries for tier thresholds |

**Query patterns**
- `findOne({ userId })` — load supporter profile
- `find().sort({ level: -1, totalPoints: -1 }).limit(100)` — global leaderboard
- `find({ totalPoints: { $gte: threshold } })` — tier promotion checks

**Write path**
- `findOneAndUpdate({ userId }, { $inc: { totalPoints: n } }, { upsert: true })` — tip event handler

---

### `auditevents`

| Index | Fields | Type | Rationale |
|---|---|---|---|
| `actorId_1_createdAt_-1` | `{ actorId: 1, createdAt: -1 }` | compound | Admin activity feed |
| `targetId_1_targetType_1_createdAt_-1` | `{ targetId: 1, targetType: 1, createdAt: -1 }` | compound | Entity history view |
| `action_1_createdAt_-1` | `{ action: 1, createdAt: -1 }` | compound | Action-type reporting |

**Query patterns**
- `find({ actorId }).sort({ createdAt: -1 }).limit(50)` — admin activity log
- `find({ targetId, targetType }).sort({ createdAt: -1 })` — entity audit trail
- `find({ action: "MODERATION_BAN", createdAt: { $gte: since } })` — moderation report

**Write path**
- `create(event)` — append-only; no updates ever

**TTL consideration**
- Audit events older than 2 years can be archived. Add TTL index when retention policy is confirmed:
  ```js
  db.auditevents.createIndex({ createdAt: 1 }, { expireAfterSeconds: 63072000 })
  ```

---

### `migrationrecords`

| Index | Fields | Type | Rationale |
|---|---|---|---|
| `name_1` | `{ name: 1 }` | unique | Idempotency check at startup |

**Query patterns**
- `findOne({ name })` — check if migration already applied

---

### `patients`

| Index | Fields | Type | Rationale |
|---|---|---|---|
| `clinicId_1` | `{ clinicId: 1 }` | single | List patients per clinic |
| `clinicId_1_createdAt_-1` | `{ clinicId: 1, createdAt: -1 }` | compound | Recent patients view |

> Note: Patient collection schema is pending (CHORD-036 dependency). Indexes above are provisional.

---

## Missing / Recommended Indexes

| Collection | Recommended Index | Priority | Reason |
|---|---|---|---|
| `auditevents` | TTL on `createdAt` | Medium | Data retention compliance |
| `supporterreputations` | `{ "badges.id": 1 }` | Low | Badge lookup if badge search is added |
| `users` | `{ role: 1, clinicId: 1 }` | Low | Role-filtered staff queries |

---

## Index Maintenance Notes

1. All indexes are created with `{ background: true }` via the migration framework to avoid blocking production writes.
2. Compound index field order follows ESR rule (Equality → Sort → Range).
3. Sparse indexes are used where fields are optional to avoid indexing null entries.
4. Index sizes should be reviewed at 100k+ documents per collection.
