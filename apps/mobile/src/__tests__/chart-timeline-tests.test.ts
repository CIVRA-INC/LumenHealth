type ChartRecord = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number; height: number };
  notes: string;
};

function calculateAge(dob: string): number {
  const d = new Date(dob);
  const n = new Date();
  let age = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) age--;
  return age;
}

function calcBMI(weight: number, heightCm: number): number {
  return Math.round((weight / ((heightCm / 100) * (heightCm / 100))) * 10) / 10;
}

function validateRecord(data: Partial<ChartRecord>): string[] {
  const e: string[] = [];
  if (!data.date) e.push("Date is required");
  if (!data.encounterType) e.push("Encounter type is required");
  if (data.vitals) {
    if (data.vitals.systolic < 60 || data.vitals.systolic > 250) e.push("Systolic out of range");
    if (data.vitals.diastolic < 30 || data.vitals.diastolic > 150) e.push("Diastolic out of range");
    if (data.vitals.heartRate < 30 || data.vitals.heartRate > 250) e.push("Heart rate out of range");
    if (data.vitals.weight < 20 || data.vitals.weight > 300) e.push("Weight out of range");
  }
  return e;
}

function summarize(r: ChartRecord): Record<string, unknown> {
  return {
    id: r.id,
    date: r.date,
    bp: `${r.vitals.systolic}/${r.vitals.diastolic}`,
    hr: r.vitals.heartRate,
    bmi: calcBMI(r.vitals.weight, r.vitals.height),
    type: r.encounterType,
  };
}

const fixtures = {
  record: {
    id: "ct_mob_01",
    patientId: "pat_mob_tf_01",
    date: "2026-07-15",
    encounterType: "checkup",
    vitals: { systolic: 118, diastolic: 78, heartRate: 70, temperature: 36.8, weight: 72, height: 175 },
    notes: "Routine",
  } satisfies ChartRecord,
  invalidVitals: { systolic: 300, diastolic: 0, heartRate: 5, weight: 500, height: 1 },
};

describe("Chart Timeline Mobile — Tests & Fixtures", () => {
  it("calculates age", () => {
    const age = calculateAge("1990-04-12");
    expect(age).toBeGreaterThanOrEqual(30);
  });

  it("calculates BMI", () => {
    expect(calcBMI(72, 175)).toBe(23.5);
  });

  it("validates a valid record", () => {
    expect(validateRecord(fixtures.record)).toEqual([]);
  });

  it("rejects records with out-of-range vitals", () => {
    const errors = validateRecord({ date: "2026-07-01", encounterType: "checkup", vitals: fixtures.invalidVitals as ChartRecord["vitals"] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("summarizes a record", () => {
    const s = summarize(fixtures.record);
    expect(s.bp).toBe("118/78");
    expect(s.bmi).toBe(23.5);
  });
});
