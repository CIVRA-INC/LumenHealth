export type ChartTimelineEntry = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  location: string;
  notes: string;
};

export type VitalsSnapshot = {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  height: number;
  bmi: number;
};

export type ChartEvent = {
  entry: ChartTimelineEntry;
  vitals: VitalsSnapshot;
  medications: string[];
  procedures: string[];
};

const entries: ChartEvent[] = [];
let idCounter = 0;

export function createChartEvent(
  patientId: string,
  data: Omit<ChartTimelineEntry, "id">,
  vitals: Omit<VitalsSnapshot, "bmi">,
): ChartEvent {
  idCounter++;
  const bmi = vitals.weight / ((vitals.height / 100) * (vitals.height / 100));
  const entry: ChartEvent = {
    entry: { id: `chart_${idCounter}`, patientId, ...data },
    vitals: { ...vitals, bmi: Math.round(bmi * 10) / 10 },
    medications: [],
    procedures: [],
  };
  entries.push(entry);
  return entry;
}

export function getTimeline(patientId: string): ChartEvent[] {
  return entries.filter((e) => e.entry.patientId === patientId).sort((a, b) => a.entry.date.localeCompare(b.entry.date));
}

export function getLatestVitals(patientId: string): VitalsSnapshot | undefined {
  const timeline = getTimeline(patientId);
  return timeline[timeline.length - 1]?.vitals;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  return Math.round((weightKg / ((heightCm / 100) * (heightCm / 100))) * 10) / 10;
}

export function categorizeBMI(bmi: number): string {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export const fixtures = {
  checkup: {
    patientId: "pat_ct_01",
    entry: { date: "2026-06-15", encounterType: "checkup", provider: "Dr. Smith", location: "Clinic A", notes: "Routine" },
    vitals: { systolic: 118, diastolic: 76, heartRate: 68, temperature: 36.8, weight: 72, height: 175 },
  },
};
