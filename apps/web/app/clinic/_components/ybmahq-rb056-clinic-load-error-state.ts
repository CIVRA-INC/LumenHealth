import type { Clinic } from "@lumen/types";

export type LoadStatus = "idle" | "loading" | "success" | "error";
export type SaveStatus = "idle" | "saving" | "success" | "error";

export type ClinicLoadErrorViewState = {
  showLoading: boolean;
  showLoadErrorOnly: boolean;
  showForm: boolean;
  canRetryLoad: boolean;
  canSubmit: boolean;
};

export function deriveClinicLoadErrorViewState(params: {
  loadStatus: LoadStatus;
  clinic: Clinic | null;
}): ClinicLoadErrorViewState {
  const { loadStatus, clinic } = params;
  if (loadStatus === "loading" || (loadStatus === "idle" && !clinic)) {
    return {
      showLoading: true,
      showLoadErrorOnly: false,
      showForm: false,
      canRetryLoad: false,
      canSubmit: false,
    };
  }
  if (loadStatus === "error") {
    return {
      showLoading: false,
      showLoadErrorOnly: true,
      showForm: false,
      canRetryLoad: true,
      canSubmit: false,
    };
  }
  return {
    showLoading: false,
    showLoadErrorOnly: false,
    showForm: true,
    canRetryLoad: false,
    canSubmit: !!clinic,
  };
}

export function getSubmitGuardError(clinic: Clinic | null): string | null {
  if (!clinic) {
    return "Clinic details are unavailable. Reload the clinic before saving.";
  }
  return null;
}
