export type UiFlowStep = "select-type" | "configure" | "review" | "confirmed";

export type ConsentFlowState = {
  step: UiFlowStep;
  patientId: string;
  consentType: string;
  scope: string;
  expiresAt: string;
  error?: string;
};

export function createConsentFlow(patientId: string): ConsentFlowState {
  return { step: "select-type", patientId, consentType: "", scope: "", expiresAt: "" };
}

export function transitionFlow(current: UiFlowStep, action: string): UiFlowStep {
  const map: Record<UiFlowStep, Record<string, UiFlowStep>> = {
    "select-type": { next: "configure", back: "select-type" },
    configure: { next: "review", back: "select-type" },
    review: { confirm: "confirmed", back: "configure" },
    confirmed: { reset: "select-type" },
  };
  return map[current]?.[action] || current;
}

export function validateFlowState(state: ConsentFlowState): string[] {
  const errors: string[] = [];
  if (state.step === "select-type" || state.step === "review") {
    if (!state.consentType) errors.push("Consent type is required");
  }
  if (state.step === "configure" || state.step === "review") {
    if (!state.scope.trim()) errors.push("Scope is required");
  }
  return errors;
}

export function summarizeConsent(state: ConsentFlowState): string {
  const expiry = state.expiresAt ? `until ${state.expiresAt}` : "no expiry";
  return `${state.consentType}: ${state.scope} (${expiry})`;
}

export const fixtures = {
  patientId: "pat_flow_cns_01",
  validState: { consentType: "data-sharing", scope: "share vitals with provider", expiresAt: "2027-01-01" },
  invalidState: { consentType: "", scope: "" },
};
