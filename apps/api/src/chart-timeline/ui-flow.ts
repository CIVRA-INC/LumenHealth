export type ChartTimelineEntry = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number };
  summary: string;
};

export type UiFlowStep = "select-patient" | "enter-vitals" | "review-chart" | "confirmed";
export type UiFlowState = { step: UiFlowStep; patientId: string; draft?: Partial<ChartTimelineEntry> };

export function createFlow(patientId: string): UiFlowState {
  return { step: "select-patient", patientId, draft: {} };
}

export function transition(current: UiFlowStep, action: string): UiFlowStep {
  const map: Record<UiFlowStep, Record<string, UiFlowStep>> = {
    "select-patient": { next: "enter-vitals" },
    "enter-vitals": { next: "review-chart", back: "select-patient" },
    "review-chart": { confirm: "confirmed", back: "enter-vitals" },
    "confirmed": { reset: "select-patient" },
  };
  return map[current]?.[action] || current;
}

export function validateVitals(vitals: Record<string, number>): string[] {
  const errors: string[] = [];
  if (!vitals.systolic || vitals.systolic < 60 || vitals.systolic > 250) errors.push("systolic out of range (60-250)");
  if (vitals.diastolic === undefined || vitals.diastolic < 30 || vitals.diastolic > 150) errors.push("diastolic out of range (30-150)");
  if (!vitals.heartRate || vitals.heartRate < 30 || vitals.heartRate > 250) errors.push("heartRate out of range (30-250)");
  if (!vitals.weight || vitals.weight < 20 || vitals.weight > 300) errors.push("weight out of range (20-300 kg)");
  return errors;
}

export function buildChartSummary(entry: ChartTimelineEntry): string {
  const bp = `${entry.vitals.systolic}/${entry.vitals.diastolic}`;
  return `${entry.date} - ${entry.encounterType} - BP: ${bp}, HR: ${entry.vitals.heartRate}, WT: ${entry.vitals.weight}kg`;
}

export const fixtures = {
  validVitals: { systolic: 120, diastolic: 80, heartRate: 72, temperature: 36.9, weight: 70 },
  invalidVitals: { systolic: 300, diastolic: 0, heartRate: 10, temperature: 36, weight: 500 },
  patientId: "pat_ui_ct_01",
};
