import type { AuditEntry, AuditQuery, BatchAnchorResult } from "@lumen/types";

const store = new Map<string, AuditEntry>();
const clinicIndex = new Map<string, Set<string>>();
const actionIndex = new Map<string, Set<string>>();

const snapshotBuffer: string[] = [];

function save(entry: AuditEntry): AuditEntry {
  store.set(entry.auditId, entry);

  const clinicIds = clinicIndex.get(entry.clinicId) ?? new Set<string>();
  clinicIds.add(entry.auditId);
  clinicIndex.set(entry.clinicId, clinicIds);

  const actionIds = actionIndex.get(entry.action) ?? new Set<string>();
  actionIds.add(entry.auditId);
  actionIndex.set(entry.action, actionIds);

  return entry;
}

/** Serializes the in-memory trail to the snapshot buffer for durability. */
function persistSnapshot(): void {
  snapshotBuffer.length = 0;
  for (const entry of store.values()) {
    snapshotBuffer.push(JSON.stringify(entry));
  }
}

/** Replays the most recent snapshot back into the store. */
function restoreSnapshot(): void {
  store.clear();
  for (const line of snapshotBuffer) {
    const entry = JSON.parse(line) as AuditEntry;
    store.set(entry.auditId, entry);
  }
}

function findById(auditId: string): AuditEntry | undefined {
  return store.get(auditId);
}

function findUnanchored(): AuditEntry[] {
  return [...store.values()].filter((entry) => !entry.stellarTxHash);
}

/**
 * Applies a completed batch (or immediate) anchor result: stamps
 * `stellarTxHash`, `merkleRoot`, `anchoredAt`, `anchorMode`, and the
 * per-entry `merkleProof` onto each entry named in the result. Entries not
 * found in the store are skipped — the caller decides whether that's an
 * error.
 */
function applyAnchorResult(result: BatchAnchorResult): AuditEntry[] {
  const updated: AuditEntry[] = [];

  for (const { auditId, merkleProof } of result.entries) {
    const entry = store.get(auditId);
    if (!entry) continue;

    const anchored: AuditEntry = {
      ...entry,
      stellarTxHash: result.stellarTxHash,
      merkleRoot: result.merkleRoot,
      anchoredAt: result.anchoredAt,
      anchorMode: result.mode,
      merkleProof,
    };
    store.set(auditId, anchored);
    updated.push(anchored);
  }

  return updated;
}

/** All entries for a clinic in a date range, unpaginated — used for compliance exports. */
function findAllInRange(clinicId: string, from?: string, to?: string): AuditEntry[] {
  const results: AuditEntry[] = [];

  for (const entry of store.values()) {
    if (entry.clinicId !== clinicId) continue;
    if (from && entry.createdAt < from) continue;
    if (to && entry.createdAt > to) continue;
    results.push(entry);
  }

  results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return results;
}

function query(q: AuditQuery): { entries: AuditEntry[]; total: number } {
  let results: AuditEntry[] = [];

  for (const entry of store.values()) {
    if (entry.clinicId !== q.clinicId) continue;
    if (q.action && entry.action !== q.action) continue;
    if (q.actorId && entry.actorId !== q.actorId) continue;
    if (q.targetId && entry.targetId !== q.targetId) continue;
    if (q.from && entry.createdAt < q.from) continue;
    if (q.to && entry.createdAt > q.to) continue;
    if (q.anchored !== undefined && Boolean(entry.stellarTxHash) !== q.anchored) continue;
    results.push(entry);
  }

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = results.length;
  const page = q.page ?? 1;
  const limit = q.limit ?? 50;
  const offset = (page - 1) * limit;
  results = results.slice(offset, offset + limit);

  return { entries: results, total };
}

function _reset(): void {
  store.clear();
  clinicIndex.clear();
  actionIndex.clear();
  snapshotBuffer.length = 0;
}

export const auditStore = {
  save,
  findById,
  findUnanchored,
  findAllInRange,
  applyAnchorResult,
  query,
  persistSnapshot,
  restoreSnapshot,
  _reset,
};
