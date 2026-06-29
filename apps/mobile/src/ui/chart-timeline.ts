export type ChartFlowStep = "patient" | "vitals" | "confirm" | "done";

export type ChartEntry = {
  patientId: string;
  date: string;
  encounterType: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  notes: string;
};

export type StepState = {
  step: ChartFlowStep;
  entry: ChartEntry;
  errors: string[];
};

const emptyEntry: ChartEntry = {
  patientId: "", date: "", encounterType: "checkup",
  systolic: 0, diastolic: 0, heartRate: 0, temperature: 0, weight: 0, notes: "",
};

export function createInitialState(): StepState {
  return { step: "patient", entry: { ...emptyEntry }, errors: [] };
}

export function nextStep(current: ChartFlowStep): ChartFlowStep | null {
  const steps: ChartFlowStep[] = ["patient", "vitals", "confirm", "done"];
  const idx = steps.indexOf(current);
  return idx < steps.length - 1 ? steps[idx + 1] : null;
}

export function prevStep(current: ChartFlowStep): ChartFlowStep | null {
  const steps: ChartFlowStep[] = ["patient", "vitals", "confirm", "done"];
  const idx = steps.indexOf(current);
  return idx > 0 ? steps[idx - 1] : null;
}

export function validateStep(step: ChartFlowStep, entry: ChartEntry): string[] {
  const errors: string[] = [];
  if (step === "patient") {
    if (!entry.patientId.trim()) errors.push("Patient ID is required");
    if (!entry.date) errors.push("Date is required");
  }
  if (step === "vitals") {
    if (entry.systolic < 60 || entry.systolic > 250) errors.push("Systolic must be 60-250");
    if (entry.diastolic < 30 || entry.diastolic > 150) errors.push("Diastolic must be 30-150");
    if (entry.heartRate < 30 || entry.heartRate > 250) errors.push("Heart rate must be 30-250");
    if (entry.weight < 20 || entry.weight > 300) errors.push("Weight must be 20-300 kg");
  }
  return errors;
}

export function getSummary(entry: ChartEntry): string {
  return `[${entry.date}] ${entry.encounterType} — BP ${entry.systolic}/${entry.diastolic}, HR ${entry.heartRate}, WT ${entry.weight}kg`;
}

export const fixtures = {
  validPatient: { patientId: "pat_mob_01", date: "2026-06-20", encounterType: "checkup" } as Partial<ChartEntry>,
  validVitals: { systolic: 120, diastolic: 80, heartRate: 72, temperature: 36.9, weight: 70 } as Partial<ChartEntry>,
  invalidVitals: { systolic: 300, diastolic: 0, heartRate: 10, weight: 500 } as Partial<ChartEntry>,
};
