import type { AuditEntry, AuditQuery } from "@lumen/types";

const store = new Map<string, AuditEntry>();

function save(entry: AuditEntry): AuditEntry {
  store.set(entry.auditId, entry);
  return entry;
}

function findById(auditId: string): AuditEntry | undefined {
  return store.get(auditId);
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
}

export const auditStore = { save, findById, query, _reset };
