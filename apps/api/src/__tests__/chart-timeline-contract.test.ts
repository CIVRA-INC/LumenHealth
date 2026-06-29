type ChartTimelineEntry = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number };
  summary: string;
};

type CreateEntryPayload = Omit<ChartTimelineEntry, "id">;

type ContractResponse = {
  status: number;
  body: unknown;
};

const store = new Map<string, ChartTimelineEntry[]>();

function ensure(patientId: string): ChartTimelineEntry[] {
  if (!store.has(patientId)) store.set(patientId, []);
  return store.get(patientId)!;
}

function validate(payload: Record<string, unknown>): string | null {
  if (!payload.date) return "date is required";
  if (!payload.encounterType) return "encounterType is required";
  if (!payload.vitals) return "vitals are required";
  return null;
}

export const contract = {
  create(patientId: string, data: Record<string, unknown>): ContractResponse {
    const error = validate(data);
    if (error) return { status: 400, body: { error: "VALIDATION_ERROR", message: error } };
    const entries = ensure(patientId);
    const entry: ChartTimelineEntry = {
      id: `chart_${Date.now()}`,
      patientId,
      date: data.date as string,
      encounterType: data.encounterType as string,
      provider: (data.provider as string) || "",
      vitals: data.vitals as ChartTimelineEntry["vitals"],
      summary: (data.summary as string) || "",
    };
    entries.push(entry);
    return { status: 201, body: entry };
  },

  get(patientId: string): ContractResponse {
    const entries = store.get(patientId);
    if (!entries || entries.length === 0) return { status: 404, body: { error: "NOT_FOUND" } };
    return { status: 200, body: entries.sort((a, b) => a.date.localeCompare(b.date)) };
  },

  getLatest(patientId: string): ContractResponse {
    const entries = store.get(patientId);
    if (!entries || entries.length === 0) return { status: 404, body: { error: "NOT_FOUND" } };
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    return { status: 200, body: sorted[sorted.length - 1] };
  },

  reset() { store.clear(); },
};

const validPayload = {
  date: "2026-06-15",
  encounterType: "checkup",
  provider: "Dr. Smith",
  vitals: { systolic: 118, diastolic: 76, heartRate: 68, temperature: 36.8, weight: 72 },
  summary: "Routine checkup, vitals normal",
};

describe("Chart Timeline API Contract", () => {
  beforeEach(() => contract.reset());

  it("creates a chart entry", () => {
    const res = contract.create("pat_ct_01", validPayload);
    expect(res.status).toBe(201);
    expect((res.body as ChartTimelineEntry).patientId).toBe("pat_ct_01");
  });

  it("rejects entry without required fields", () => {
    const res = contract.create("pat_ct_01", {});
    expect(res.status).toBe(400);
  });

  it("retrieves entries for a patient", () => {
    contract.create("pat_ct_01", validPayload);
    const res = contract.get("pat_ct_01");
    expect(res.status).toBe(200);
    expect((res.body as ChartTimelineEntry[])).toHaveLength(1);
  });

  it("returns 404 for unknown patient", () => {
    const res = contract.get("pat_unknown");
    expect(res.status).toBe(404);
  });

  it("gets latest entry", () => {
    contract.create("pat_ct_01", { ...validPayload, date: "2026-06-01" });
    contract.create("pat_ct_01", { ...validPayload, date: "2026-07-01" });
    const res = contract.getLatest("pat_ct_01");
    expect((res.body as ChartTimelineEntry).date).toBe("2026-07-01");
  });
});
