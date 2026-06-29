export type ChartContractDTO = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number; height: number };
  notes: string;
  createdAt: string;
};

export type CreateContractPayload = Omit<ChartContractDTO, "id" | "createdAt">;

export type ContractResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const db = new Map<string, ChartContractDTO[]>();
let counter = 0;

function ensure(pid: string): ChartContractDTO[] {
  if (!db.has(pid)) db.set(pid, []);
  return db.get(pid)!;
}

export const contractApi = {
  create(patientId: string, payload: Record<string, unknown>): ContractResult<ChartContractDTO> {
    if (!payload.date || !payload.encounterType) return { ok: false, error: "date and encounterType required" };
    counter++;
    const record: ChartContractDTO = {
      id: `ctc_${counter}`,
      patientId,
      date: payload.date as string,
      encounterType: payload.encounterType as string,
      provider: (payload.provider as string) || "",
      vitals: payload.vitals as ChartContractDTO["vitals"],
      notes: (payload.notes as string) || "",
      createdAt: new Date().toISOString(),
    };
    ensure(patientId).push(record);
    return { ok: true, data: record };
  },

  get(patientId: string): ContractResult<ChartContractDTO[]> {
    const entries = db.get(patientId);
    if (!entries || entries.length === 0) return { ok: false, error: "NOT_FOUND" };
    return { ok: true, data: [...entries].sort((a, b) => a.date.localeCompare(b.date)) };
  },

  getLatest(patientId: string): ContractResult<ChartContractDTO> {
    const entries = db.get(patientId);
    if (!entries || entries.length === 0) return { ok: false, error: "NOT_FOUND" };
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    return { ok: true, data: sorted[sorted.length - 1] };
  },

  reset() { db.clear(); counter = 0; },
};
