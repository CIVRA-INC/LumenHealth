export type ChartTimelineEntry = {
  date: string;
  encounterType: "checkup" | "follow-up" | "emergency" | "lab";
  provider: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number; height: number };
  medications: string[];
  notes: string;
};

export type TimelineSummary = {
  date: string;
  encounterType: string;
  bp: string;
  hr: number;
  bmi: number;
};

export function createEntry(data: ChartTimelineEntry): ChartTimelineEntry {
  return { ...data, medications: data.medications || [] };
}

export function calculateBMI(weight: number, height: number): number {
  return Math.round((weight / ((height / 100) * (height / 100))) * 10) / 10;
}

export function toSummary(entry: ChartTimelineEntry): TimelineSummary {
  return {
    date: entry.date,
    encounterType: entry.encounterType,
    bp: `${entry.vitals.systolic}/${entry.vitals.diastolic}`,
    hr: entry.vitals.heartRate,
    bmi: calculateBMI(entry.vitals.weight, entry.vitals.height),
  };
}

export function validateEntry(data: Partial<ChartTimelineEntry>): string[] {
  const errors: string[] = [];
  if (!data.date) errors.push("Date is required");
  if (!data.encounterType) errors.push("Encounter type is required");
  if (!data.vitals?.systolic || data.vitals.systolic < 60 || data.vitals.systolic > 250) errors.push("Systolic out of range");
  if (data.vitals?.diastolic === undefined || data.vitals.diastolic < 30 || data.vitals.diastolic > 150) errors.push("Diastolic out of range");
  if (!data.vitals?.weight || data.vitals.weight < 20 || data.vitals.weight > 300) errors.push("Weight out of range");
  return errors;
}

export const fixtures = {
  validEntry: {
    date: "2026-07-01",
    encounterType: "checkup" as const,
    provider: "Dr. Smith",
    vitals: { systolic: 120, diastolic: 80, heartRate: 72, temperature: 36.9, weight: 70, height: 175 },
    medications: ["Ibuprofen"],
    notes: "Annual physical",
  } satisfies ChartTimelineEntry,
  missingDate: { encounterType: "checkup", vitals: { systolic: 120, diastolic: 80, heartRate: 72, temperature: 36.9, weight: 70, height: 175 } } as Partial<ChartTimelineEntry>,
};
