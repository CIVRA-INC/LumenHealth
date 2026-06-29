import type { Request, Response } from "express";

type ChartTimelineEntry = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  bmi: number;
  notes: string;
};

type CreateEntryInput = Omit<ChartTimelineEntry, "id" | "bmi">;

const db = new Map<string, ChartTimelineEntry[]>();
const k = (pid: string) => pid;

function calcBMI(weight: number, heightCm: number): number {
  return Math.round((weight / ((heightCm / 100) * (heightCm / 100))) * 10) / 10;
}

function getEntries(patientId: string): ChartTimelineEntry[] {
  return db.get(k(patientId)) || [];
}

export function handleAddEntry(req: Request, res: Response) {
  const body = req.body as CreateEntryInput;
  if (!body.date || !body.encounterType) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "date and encounterType are required" });
    return;
  }
  const bmi = body.heightCm ? calcBMI(body.weight, body.heightCm) : 0;
  const entry: ChartTimelineEntry = {
    id: `ct_${Date.now()}`,
    patientId: req.params.patientId,
    ...body,
    bmi,
  };
  const entries = getEntries(req.params.patientId);
  entries.push(entry);
  db.set(k(req.params.patientId), entries);
  res.status(201).json(entry);
}

export function handleGetTimeline(req: Request, res: Response) {
  const entries = getEntries(req.params.patientId);
  if (entries.length === 0) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  res.json(entries.sort((a, b) => a.date.localeCompare(b.date)));
}

export function handleGetLatest(req: Request, res: Response) {
  const entries = getEntries(req.params.patientId);
  if (entries.length === 0) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  res.json(sorted[sorted.length - 1]);
}

export function formatVitalsString(entry: ChartTimelineEntry): string {
  return `BP ${entry.systolic}/${entry.diastolic} | HR ${entry.heartRate} | WT ${entry.weight}kg | BMI ${entry.bmi}`;
}

const validEntry = {
  date: "2026-06-25",
  encounterType: "checkup",
  provider: "Dr. Smith",
  systolic: 118,
  diastolic: 76,
  heartRate: 68,
  temperature: 36.7,
  weight: 72,
  heightCm: 175,
  notes: "Routine",
};

describe("Chart Timeline — Tests & Fixtures", () => {
  let res: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    res = { status, json };
    db.clear();
  });

  it("creates a chart entry", () => {
    handleAddEntry({ params: { patientId: "pat_tf_01" }, body: validEntry } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ patientId: "pat_tf_01", bmi: 23.5 }));
  });

  it("rejects entry without required fields", () => {
    handleAddEntry({ params: { patientId: "pat_tf_01" }, body: {} } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("retrieves timeline sorted by date", () => {
    handleAddEntry({ params: { patientId: "pat_tf_01" }, body: { ...validEntry, date: "2026-07-01" } } as unknown as Request, res as Response);
    handleAddEntry({ params: { patientId: "pat_tf_01" }, body: { ...validEntry, date: "2026-06-01" } } as unknown as Request, res as Response);
    handleGetTimeline({ params: { patientId: "pat_tf_01" } } as unknown as Request, res as Response);
    const entries = (json.mock.calls[json.mock.calls.length - 1][0] as ChartTimelineEntry[]);
    expect(entries[0].date).toBe("2026-06-01");
    expect(entries[1].date).toBe("2026-07-01");
  });

  it("gets latest entry", () => {
    handleAddEntry({ params: { patientId: "pat_tf_01" }, body: validEntry } as unknown as Request, res as Response);
    handleAddEntry({ params: { patientId: "pat_tf_01" }, body: { ...validEntry, date: "2026-07-01" } } as unknown as Request, res as Response);
    handleGetLatest({ params: { patientId: "pat_tf_01" } } as unknown as Request, res as Response);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ date: "2026-07-01" }));
  });

  it("returns 404 for missing timeline", () => {
    handleGetTimeline({ params: { patientId: "pat_missing" } } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("formats vitals string", () => {
    const entry = { id: "ct_1", patientId: "pat_tf_01", ...validEntry, bmi: 23.5 };
    expect(formatVitalsString(entry)).toContain("BP 118/76");
    expect(formatVitalsString(entry)).toContain("BMI 23.5");
  });
});

export { validEntry as fixtures };
