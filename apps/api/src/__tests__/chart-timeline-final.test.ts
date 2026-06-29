type ChartTimelineEntry = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number; height: number };
  notes: string;
};

function createEntry(patientId: string, data: Omit<ChartTimelineEntry, "id">): ChartTimelineEntry {
  return { id: `ct_all_${Date.now()}`, patientId, ...data };
}

function validateAll(data: Record<string, unknown>): string[] {
  const e: string[] = [];
  if (!data.date) e.push("date required");
  if (!data.encounterType) e.push("encounterType required");
  if (data.vitals && typeof data.vitals === "object") {
    const v = data.vitals as Record<string, number>;
    if (!v.systolic || v.systolic < 60) e.push("systolic too low");
    if (v.systolic > 250) e.push("systolic too high");
    if (v.diastolic === undefined || v.diastolic < 30) e.push("diastolic too low");
    if (v.diastolic > 150) e.push("diastolic too high");
  }
  return e;
}

function calcAvgSystolic(entries: ChartTimelineEntry[]): number {
  if (entries.length === 0) return 0;
  return Math.round(entries.reduce((s, e) => s + e.vitals.systolic, 0) / entries.length);
}

function formatEntry(entry: ChartTimelineEntry): string {
  return `${entry.date} [${entry.encounterType}] BP ${entry.vitals.systolic}/${entry.vitals.diastolic} HR ${entry.vitals.heartRate}`;
}

const validInput = {
  date: "2026-07-20",
  encounterType: "checkup",
  vitals: { systolic: 120, diastolic: 80, heartRate: 72, temperature: 36.9, weight: 70, height: 175 },
  notes: "Final tests",
};

describe("Chart Timeline — Final Tests & Fixtures", () => {
  it("creates an entry", () => {
    const entry = createEntry("pat_final_01", validInput);
    expect(entry.patientId).toBe("pat_final_01");
    expect(entry.id).toMatch(/^ct_all_/);
  });

  it("validates complete entry", () => {
    expect(validateAll(validInput)).toEqual([]);
  });

  it("catches missing required fields", () => {
    const errors = validateAll({});
    expect(errors).toContain("date required");
    expect(errors).toContain("encounterType required");
  });

  it("catches out-of-range vitals", () => {
    const errors = validateAll({ date: "2026-07-01", encounterType: "checkup", vitals: { systolic: 300, diastolic: 0 } });
    expect(errors).toContain("systolic too high");
    expect(errors).toContain("diastolic too low");
  });

  it("calculates average systolic", () => {
    const e1 = createEntry("pat_final_01", { ...validInput, date: "2026-06-01", vitals: { ...validInput.vitals, systolic: 118 } });
    const e2 = createEntry("pat_final_01", { ...validInput, date: "2026-07-01", vitals: { ...validInput.vitals, systolic: 122 } });
    expect(calcAvgSystolic([e1, e2])).toBe(120);
  });

  it("formats entry as string", () => {
    const entry = createEntry("pat_final_01", validInput);
    const formatted = formatEntry(entry);
    expect(formatted).toContain("2026-07-20");
    expect(formatted).toContain("120/80");
  });
});
