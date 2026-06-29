export type DemographicsFlowState = {
  step: "idle" | "loading" | "form" | "review" | "submitting" | "success" | "error";
  patientId: string;
  error?: string;
};

export type FormStep = "personal" | "address" | "emergency" | "review";

export type DemographicsFormData = {
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  occupation: string;
  nationality: string;
  primaryLanguage: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
};

export function getInitialState(patientId: string): DemographicsFlowState {
  return { step: "idle", patientId };
}

export function getNextStep(current: FormStep): FormStep | null {
  const steps: FormStep[] = ["personal", "address", "emergency", "review"];
  const idx = steps.indexOf(current);
  return idx < steps.length - 1 ? steps[idx + 1] : null;
}

export function getPrevStep(current: FormStep): FormStep | null {
  const steps: FormStep[] = ["personal", "address", "emergency", "review"];
  const idx = steps.indexOf(current);
  return idx > 0 ? steps[idx - 1] : null;
}

export function validateStep(step: FormStep, data: Partial<DemographicsFormData>): string[] {
  const errors: string[] = [];
  if (step === "personal") {
    if (!data.dateOfBirth) errors.push("Date of birth is required");
    if (!data.gender) errors.push("Gender is required");
  }
  if (step === "address") {
    if (!data.street?.trim()) errors.push("Street is required");
    if (!data.city?.trim()) errors.push("City is required");
    if (!data.state?.trim()) errors.push("State is required");
  }
  if (step === "emergency") {
    if (!data.emergencyName?.trim()) errors.push("Emergency contact name is required");
    if (!data.emergencyPhone?.trim()) errors.push("Emergency contact phone is required");
  }
  return errors;
}

export function flowReducer(state: DemographicsFlowState, action: { type: string; payload?: unknown }): DemographicsFlowState {
  switch (action.type) {
    case "START":
      return { ...state, step: "form" };
    case "SUBMIT":
      return { ...state, step: "submitting" };
    case "SUCCESS":
      return { ...state, step: "success" };
    case "ERROR":
      return { ...state, step: "error", error: action.payload as string };
    case "RESET":
      return getInitialState(state.patientId);
    default:
      return state;
  }
}

export const fixtures = {
  validPersonal: { dateOfBirth: "1995-06-20", gender: "female" } satisfies Partial<DemographicsFormData>,
  missingPersonal: {} satisfies Partial<DemographicsFormData>,
};
