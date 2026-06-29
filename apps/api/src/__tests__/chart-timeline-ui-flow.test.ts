type ChartEntry = {
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

type ChartFlowStep = "patient" | "vitals" | "confirm" | "done";

function createInitialState() {
  return {
    step: "patient" as ChartFlowStep,
    entry: {
      patientId: "", date: "", encounterType: "checkup",
      systolic: 0, diastolic: 0, heartRate: 0, temperature: 0, weight: 0, notes: "",
    } as ChartEntry,
    errors: [] as string[],
  };
}

function nextStep(current: ChartFlowStep): ChartFlowStep | null {
  const steps: ChartFlowStep[] = ["patient", "vitals", "confirm", "done"];
  const idx = steps.indexOf(current);
  return idx < steps.length - 1 ? steps[idx + 1] : null;
}

function prevStep(current: ChartFlowStep): ChartFlowStep | null {
  const steps: ChartFlowStep[] = ["patient", "vitals", "confirm", "done"];
  const idx = steps.indexOf(current);
  return idx > 0 ? steps[idx - 1] : null;
}

function validateStep(step: ChartFlowStep, entry: ChartEntry): string[] {
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

function getSummary(entry: ChartEntry): string {
  return `[${entry.date}] ${entry.encounterType} — BP ${entry.systolic}/${entry.diastolic}, HR ${entry.heartRate}, WT ${entry.weight}kg`;
}

const fixtures = {
  validPatient: { patientId: "pat_flow_01", date: "2026-06-20", encounterType: "checkup" } as Partial<ChartEntry>,
  validVitals: { systolic: 120, diastolic: 80, heartRate: 72, temperature: 36.9, weight: 70 } as Partial<ChartEntry>,
  invalidVitals: { systolic: 300, diastolic: 0, heartRate: 10, weight: 500 } as Partial<ChartEntry>,
};

describe("Chart Timeline UI Flow", () => {
  describe("createInitialState", () => {
    it("creates state at patient step", () => {
      const state = createInitialState();
      expect(state.step).toBe("patient");
      expect(state.entry.patientId).toBe("");
    });
  });

  describe("nextStep / prevStep", () => {
    it("navigates forward", () => {
      expect(nextStep("patient")).toBe("vitals");
      expect(nextStep("vitals")).toBe("confirm");
      expect(nextStep("confirm")).toBe("done");
      expect(nextStep("done")).toBeNull();
    });

    it("navigates backward", () => {
      expect(prevStep("done")).toBe("confirm");
      expect(prevStep("confirm")).toBe("vitals");
      expect(prevStep("vitals")).toBe("patient");
      expect(prevStep("patient")).toBeNull();
    });
  });

  describe("validateStep", () => {
    it("validates patient step", () => {
      const errors = validateStep("patient", { ...createInitialState().entry, patientId: "", date: "" });
      expect(errors).toContain("Patient ID is required");
      expect(errors).toContain("Date is required");
    });

    it("validates vitals step", () => {
      const errors = validateStep("vitals", { ...createInitialState().entry, ...fixtures.invalidVitals } as ChartEntry);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("accepts valid vitals", () => {
      const errors = validateStep("vitals", { ...createInitialState().entry, ...fixtures.validVitals } as ChartEntry);
      expect(errors).toEqual([]);
    });
  });

  describe("getSummary", () => {
    it("produces summary string", () => {
      const entry = { ...createInitialState().entry, ...fixtures.validPatient, ...fixtures.validVitals } as ChartEntry;
      const summary = getSummary(entry);
      expect(summary).toContain("2026-06-20");
      expect(summary).toContain("120/80");
    });
  });
});
