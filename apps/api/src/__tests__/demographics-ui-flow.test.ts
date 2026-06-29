type UiFlowStep = "select-patient" | "enter-demographics" | "confirm-on-chain" | "complete";

function transitionUiFlow(current: UiFlowStep, action: string): UiFlowStep {
  const transitions: Record<UiFlowStep, Record<string, UiFlowStep>> = {
    "select-patient": { next: "enter-demographics", back: "select-patient" },
    "enter-demographics": { next: "confirm-on-chain", back: "select-patient" },
    "confirm-on-chain": { next: "complete", back: "enter-demographics", confirm: "complete" },
    complete: { reset: "select-patient" },
  };
  return transitions[current]?.[action] || current;
}

function createUiFlowState(patientId: string) {
  return { step: "select-patient" as UiFlowStep, patientId };
}

function encodeStepData(data: string): string {
  return Buffer.from(data).toString("hex");
}

describe("Demographics UI Flow", () => {
  describe("transitionUiFlow", () => {
    const cases: [UiFlowStep, string, UiFlowStep][] = [
      ["select-patient", "next", "enter-demographics"],
      ["enter-demographics", "next", "confirm-on-chain"],
      ["confirm-on-chain", "confirm", "complete"],
      ["confirm-on-chain", "back", "enter-demographics"],
      ["enter-demographics", "back", "select-patient"],
      ["complete", "reset", "select-patient"],
    ];

    it.each(cases)("transitions from %s on '%s' to %s", (from, action, expected) => {
      expect(transitionUiFlow(from, action)).toBe(expected);
    });

    it("stays on same step for unknown action", () => {
      expect(transitionUiFlow("select-patient", "unknown" as string)).toBe("select-patient");
    });
  });

  describe("createUiFlowState", () => {
    it("creates initial state", () => {
      const state = createUiFlowState("pat_ui_01");
      expect(state.step).toBe("select-patient");
      expect(state.patientId).toBe("pat_ui_01");
    });
  });

  describe("encodeStepData", () => {
    it("encodes demographics data as hex", () => {
      const encoded = encodeStepData("1990-04-12|female|O+|Nigerian");
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe("string");
    });

    it("produces deterministic output", () => {
      const input = "1985-07-22|male|A+|Nigerian";
      expect(encodeStepData(input)).toBe(encodeStepData(input));
    });
  });

  it("completes full flow transition", () => {
    let state = createUiFlowState("pat_flow_01");
    expect(state.step).toBe("select-patient");
    state.step = transitionUiFlow(state.step, "next");
    expect(state.step).toBe("enter-demographics");
    state.step = transitionUiFlow(state.step, "next");
    expect(state.step).toBe("confirm-on-chain");
    state.step = transitionUiFlow(state.step, "confirm");
    expect(state.step).toBe("complete");
  });
});
