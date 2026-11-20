export type IbinolaClinicalEntityKind = "patient" | "encounter" | "vitals" | "queue";

export interface IbinolaCachedRecord {
  id: string;
  kind: IbinolaClinicalEntityKind;
  clinicId: string;
  data: Record<string, unknown>;
  viewedAtMs: number;
}

export interface IbinolaQueuedWrite {
  id: string;
  kind: IbinolaClinicalEntityKind;
  clinicId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAtMs: number;
  attempts: number;
}

export interface IbinolaOfflineCacheState {
  records: Record<string, IbinolaCachedRecord>;
  queue: IbinolaQueuedWrite[];
  replayedKeys: string[];
}

export interface IbinolaCacheOptions {
  ttlMs?: number;
  nowMs?: () => number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function now(opts?: IbinolaCacheOptions): number {
  return (opts?.nowMs ?? Date.now)();
}

export function createIbinolaOfflineState(): IbinolaOfflineCacheState {
  return { records: {}, queue: [], replayedKeys: [] };
}

export function cacheClinicalRecord(
  state: IbinolaOfflineCacheState,
  record: Omit<IbinolaCachedRecord, "viewedAtMs">,
  opts?: IbinolaCacheOptions,
): IbinolaOfflineCacheState {
  return { ...state, records: { ...state.records, [record.id]: { ...record, viewedAtMs: now(opts) } } };
}

export function readCachedRecord(
  state: IbinolaOfflineCacheState,
  id: string,
  opts?: IbinolaCacheOptions,
): IbinolaCachedRecord | null {
  const rec = state.records[id];
  if (!rec) return null;
  const ttl = opts?.ttlMs ?? DEFAULT_TTL_MS;
  if (now(opts) - rec.viewedAtMs > ttl) return null;
  return rec;
}

export function enqueueClinicalWrite(
  state: IbinolaOfflineCacheState,
  write: Omit<IbinolaQueuedWrite, "createdAtMs" | "attempts">,
  opts?: IbinolaCacheOptions,
): IbinolaOfflineCacheState {
  if (state.queue.some((q) => q.idempotencyKey === write.idempotencyKey)) return state;
  return { ...state, queue: [...state.queue, { ...write, createdAtMs: now(opts), attempts: 0 }] };
}

export function beginReplay(state: IbinolaOfflineCacheState): { toSend: IbinolaQueuedWrite[] } {
  return { toSend: state.queue.filter((q) => !state.replayedKeys.includes(q.idempotencyKey)) };
}

export function markReplaySuccess(state: IbinolaOfflineCacheState, idempotencyKey: string): IbinolaOfflineCacheState {
  const replayedKeys = state.replayedKeys.includes(idempotencyKey)
    ? state.replayedKeys
    : [...state.replayedKeys, idempotencyKey];
  return { ...state, replayedKeys, queue: state.queue.filter((q) => q.idempotencyKey !== idempotencyKey) };
}

export function wipeIbinolaOfflineState(): IbinolaOfflineCacheState {
  return createIbinolaOfflineState();
}
