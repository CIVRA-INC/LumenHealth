export type ChartTimelineRecord = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number; height: number };
  notes: string;
  createdAt: string;
};

export type CreateChartInput = Omit<ChartTimelineRecord, "id" | "createdAt">;

type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

const store = new Map<string, ChartTimelineRecord[]>();
let counter = 0;

function ensure(pid: string): ChartTimelineRecord[] {
  if (!store.has(pid)) store.set(pid, []);
  return store.get(pid)!;
}

export function createChartService() {
  function addEntry(patientId: string, input: CreateChartInput): ServiceResult<ChartTimelineRecord> {
    if (!input.date || !input.encounterType) return { ok: false, error: "date and encounterType required" };
    counter++;
    const record: ChartTimelineRecord = {
      id: `ct_svc_${counter}`,
      patientId,
      ...input,
      createdAt: new Date().toISOString(),
    };
    ensure(patientId).push(record);
    return { ok: true, data: record };
  }

  function getTimeline(patientId: string): ServiceResult<ChartTimelineRecord[]> {
    const entries = store.get(patientId);
    if (!entries || entries.length === 0) return { ok: false, error: "NOT_FOUND" };
    return { ok: true, data: [...entries].sort((a, b) => a.date.localeCompare(b.date)) };
  }

  function getLatest(patientId: string): ServiceResult<ChartTimelineRecord> {
    const entries = store.get(patientId);
    if (!entries || entries.length === 0) return { ok: false, error: "NOT_FOUND" };
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    return { ok: true, data: sorted[sorted.length - 1] };
  }

  function deleteEntry(patientId: string, entryId: string): ServiceResult<boolean> {
    const entries = store.get(patientId);
    if (!entries) return { ok: false, error: "NOT_FOUND" };
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return { ok: false, error: "NOT_FOUND" };
    entries.splice(idx, 1);
    return { ok: true, data: true };
  }

  function reset() { store.clear(); counter = 0; }

  return { addEntry, getTimeline, getLatest, deleteEntry, reset };
}

export const fixtures = {
  validInput: {
    date: "2026-07-10",
    encounterType: "follow-up",
    provider: "Dr. Smith",
    vitals: { systolic: 118, diastolic: 76, heartRate: 68, temperature: 36.7, weight: 71, height: 175 },
    notes: "Follow-up",
  } satisfies CreateChartInput,
};
