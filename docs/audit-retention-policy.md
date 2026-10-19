# Audit Retention and Legal-Hold Policy

Policy v1.0 — implemented by `apps/api/src/modules/audit/services/retention.service.ts`
(enforcement constants live there and must match this document).

Covers issue #1330 (retention, legal hold, archival) and is relied on by
#1333 (continuous integrity monitoring re-verifies archived entries through
the same verification path as hot entries).

## Why a policy now

The milestone-1 store is in-memory, so nothing can be deleted or moved today
in production. This policy exists **before** the DB-backed store lands, so
retention, legal hold and archival semantics are settled, enforced in code,
and tested — not retrofitted under a compliance deadline.

## Retention tiers

| Tier | Contents | Duration |
| --- | --- | --- |
| **Hot** | Entries in the primary store: recent, queryable, unanchored work-in-progress | first **90 days** after `createdAt` |
| **Cold archive** | Full `AuditEntry` records including `sha256Hash`, `merkleProof`, `merkleRoot`, `stellarTxHash`, `anchorMode` | from day 91 until minimum retention is served |
| **Deletable** | Only after minimum retention **and** only outside legal hold | see below |

- **Minimum retention: 7 years** from entry creation. Audit entries are
  compliance evidence for clinical operations (role changes, clinic
  archival, anchoring records); 7 years aligns with the common health-record
  retention floor of 6–10 years in our target markets and is deliberately
  set at the conservative end. Nothing may be deleted before this floor.
- Archived records carry `archivedAt` and `policyVersion` so the serving of
  minimum retention is auditable and re-evaluable if the policy version
  changes.

## Archival path

`RetentionService.runRetentionCycle()` (default cadence 6 h,
`AUDIT_RETENTION_INTERVAL_MS` overrides, `0` disables):

1. Candidate = **anchored** entry (has `stellarTxHash` + proof + root),
   `createdAt` older than 90 days.
2. Candidates on clinics **under legal hold** are skipped (hold wins over
   archival — moving evidence to a colder tier while it is under review
   risks losing operational oversight of it).
3. Unanchored candidates stay hot: archival is not a way to shed entries
   that still need anchoring.
4. The full entry is serialized to the archive sink and removed from the
   hot store.

The archive sink is pluggable (`ArchiveSink`): in-memory by default, a
JSON-file sink (`AUDIT_ARCHIVE_DIR`) for a real cold-storage mount. The
record format keeps every field verification needs, so **archived entries
verify exactly like hot ones** — `AuditService.verifyAuditEntry` falls back
to the archive automatically via `RetentionService.findEntryIncludingArchive`.

## Legal hold

- A hold is `{ clinicId | "*", reason, placedBy, placedAt }` — `"*"` scopes
  it globally. Holds block **archival and deletion**; they do not block
  writes, verification, or export.
- A hold is released explicitly (`releaseHold`), leaving an audit trail in
  the hold record itself (`releasedAt`).
- Enforcement is tested: an entry on a held clinic survives retention cycles
  in the hot store, and `canDelete` refuses deletion while a hold is active.

## Deletion

Nothing deletes archived records in this milestone (there is nothing to
delete from). `RetentionService.canDelete(record, now)` is the single
enforcement predicate any future deletion path must consult:

- refuses until `MIN_RETENTION_YEARS` have passed since the entry's
  `createdAt`;
- refuses while the clinic (or `"*"`) is under legal hold;
- otherwise allows, with the reason surfaced for logging.

## Relationship to integrity monitoring (#1333)

The integrity sampler re-verifies a random slice of anchored entries each
cycle through the standard verification path. Archived entries are included
in that pool once hot-store candidates are archived, so the 7-year retention
window stays continuously verified, not just stored.

## Change control

Any change to the constants (90-day hot tier, 7-year floor) requires a new
policy version in this document, a matching bump of
`RETENTION_POLICY_VERSION`, and a note in the retention service constants.
