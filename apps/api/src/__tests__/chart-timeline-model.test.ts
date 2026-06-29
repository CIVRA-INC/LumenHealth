type ChartTimelineEntry = {
  date: string;
  encounterType: string;
  provider: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number; height: number };
  medications: string[];
  notes: string;
};

type ChartDataModel = {
  date: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  weight: number;
  height: number;
};

function calculateBMI(weight: number, height: number): number {
  return Math.round((weight / ((height / 100) * (height / 100))) * 10) / 10;
}

function createEntry(data: ChartTimelineEntry): ChartTimelineEntry {
  return { ...data, medications: data.medications || [] };
}

function toSummary(entry: ChartTimelineEntry): Record<string, unknown> {
  return {
    date: entry.date,
    encounterType: entry.encounterType,
    bp: `${entry.vitals.systolic}/${entry.vitals.diastolic}`,
    hr: entry.vitals.heartRate,
    bmi: calculateBMI(entry.vitals.weight, entry.vitals.height),
  };
}

function validateEntry(data: Partial<ChartTimelineEntry>): string[] {
  const errors: string[] = [];
  if (!data.date) errors.push("Date is required");
  if (!data.encounterType) errors.push("Encounter type is required");
  if (!data.vitals?.systolic || data.vitals.systolic < 60 || data.vitals.systolic > 250) errors.push("Systolic out of range");
  if (!data.vitals?.weight || data.vitals.weight < 20 || data.vitals.weight > 300) errors.push("Weight out of range");
  return errors;
}

function hashModel(data: ChartDataModel): string {
  const s = `${data.date}|${data.systolic}|${data.diastolic}|${data.heartRate}|${data.weight}|${data.height}`;
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function verifyModel(expected: ChartDataModel, storedHash: string): boolean {
  return hashModel(expected) === storedHash;
}

function parseModelValue(value: string): ChartDataModel {
  const [date, systolic, diastolic, heartRate, weight, height] = value.split("|");
  return { date, systolic: Number(systolic), diastolic: Number(diastolic), heartRate: Number(heartRate), weight: Number(weight), height: Number(height) };
}

const validEntry: ChartTimelineEntry = {
  date: "2026-07-01",
  encounterType: "checkup",
  provider: "Dr. Smith",
  vitals: { systolic: 120, diastolic: 80, heartRate: 72, temperature: 36.9, weight: 70, height: 175 },
  medications: ["Ibuprofen"],
  notes: "Annual physical",
};

const stellarData: ChartDataModel = { date: "2026-07-05", systolic: 120, diastolic: 80, heartRate: 72, weight: 70, height: 175 };

describe("Chart Timeline Data Model", () => {
  describe("web model", () => {
    it("creates an entry", () => {
      const entry = createEntry(validEntry);
      expect(entry.date).toBe("2026-07-01");
    });

    it("calculates BMI", () => {
      expect(calculateBMI(70, 175)).toBe(22.9);
    });

    it("produces summary", () => {
      const summary = toSummary(validEntry);
      expect(summary.bp).toBe("120/80");
    });

    it("validates entry", () => {
      expect(validateEntry(validEntry)).toEqual([]);
      expect(validateEntry({ encounterType: "checkup", vitals: validEntry.vitals })).toContain("Date is required");
    });
  });

  describe("stellar model", () => {
    it("hashes deterministically", () => {
      expect(hashModel(stellarData)).toBe(hashModel(stellarData));
    });

    it("verifies matching data", () => {
      expect(verifyModel(stellarData, hashModel(stellarData))).toBe(true);
    });

    it("parses back original values", () => {
      const s = `${stellarData.date}|${stellarData.systolic}|${stellarData.diastolic}|${stellarData.heartRate}|${stellarData.weight}|${stellarData.height}`;
      const parsed = parseModelValue(s);
      expect(parsed.systolic).toBe(120);
    });
  });
});
