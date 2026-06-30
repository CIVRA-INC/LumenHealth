/**
 * Mobile consent-and-privacy UI flow (#702).
 *
 * Pure-data state machine for the grant/revoke wizard the mobile shell
 * renders against. Modeled on `ui/documents.ts` so the two flows share
 * the same step/next/prev/validate/getSummary shape — anything that
 * deviates here either belongs in `services/consent.ts` (network) or
 * `hooks/useConsent.ts` (React state).
 *
 * Flow:
 *   `type` → `scope` → `expiry` → `review` → `confirm` → `done`
 *
 * `type`    pick one of the four enumerated consent types
 * `scope`   pick one or more scope tags (e.g. data sharing categories)
 * `expiry`  optional expiry date (ISO-8601 yyyy-mm-dd) or "no expiry"
 * `review`  read-only summary of the grant
 * `confirm` user taps confirm; service call happens in the next layer
 * `done`    success state; UI shows the receipt
 */

export type ConsentType =
  | "data_processing"
  | "sharing"
  | "research"
  | "communications";

export type ConsentUiStep =
  | "type"
  | "scope"
  | "expiry"
  | "review"
  | "confirm"
  | "done";

export type ConsentDraft = {
  patientId: string;
  consentType: ConsentType | "";
  scopes: string[];
  /** ISO-8601 date string (yyyy-mm-dd) or empty for no expiry. */
  expiresAt: string;
};

export type ConsentStepState = {
  step: ConsentUiStep;
  draft: ConsentDraft;
  errors: string[];
};

const STEPS: ConsentUiStep[] = [
  "type",
  "scope",
  "expiry",
  "review",
  "confirm",
  "done",
];

const ALLOWED_TYPES: readonly ConsentType[] = [
  "data_processing",
  "sharing",
  "research",
  "communications",
];

const ALLOWED_SCOPES = new Set<string>([
  "demographics",
  "clinical_notes",
  "lab_results",
  "imaging",
  "billing",
  "messaging",
  "third_party_share",
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const emptyDraft: ConsentDraft = {
  patientId: "",
  consentType: "",
  scopes: [],
  expiresAt: "",
};

export function createInitialState(patientId = ""): ConsentStepState {
  return {
    step: "type",
    draft: { ...emptyDraft, patientId },
    errors: [],
  };
}

export function nextStep(current: ConsentUiStep): ConsentUiStep | null {
  const idx = STEPS.indexOf(current);
  return idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : null;
}

export function prevStep(current: ConsentUiStep): ConsentUiStep | null {
  const idx = STEPS.indexOf(current);
  return idx > 0 ? STEPS[idx - 1] : null;
}

export function isAllowedScope(scope: string): boolean {
  return ALLOWED_SCOPES.has(scope);
}

export function isFutureIsoDate(value: string, today = new Date()): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const target = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return false;
  const todayMidnight = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  return target.getTime() > todayMidnight.getTime();
}

export function validateStep(
  step: ConsentUiStep,
  draft: ConsentDraft,
  today: Date = new Date(),
): string[] {
  const errors: string[] = [];
  if (!draft.patientId.trim()) errors.push("Patient is required");
  if (step === "type" || step === "scope" || step === "expiry" || step === "review") {
    if (!draft.consentType) errors.push("Consent type is required");
    else if (!ALLOWED_TYPES.includes(draft.consentType as ConsentType)) {
      errors.push("Consent type is not recognized");
    }
  }
  if (step === "scope" || step === "expiry" || step === "review") {
    if (draft.scopes.length === 0) errors.push("At least one scope is required");
    else {
      for (const s of draft.scopes) {
        if (!isAllowedScope(s)) {
          errors.push(`Scope '${s}' is not recognized`);
          break;
        }
      }
    }
  }
  if (step === "expiry" || step === "review") {
    if (draft.expiresAt && !isFutureIsoDate(draft.expiresAt, today)) {
      errors.push("Expiry date must be in the future");
    }
  }
  return errors;
}

export function getSummary(draft: ConsentDraft): string {
  const expiry = draft.expiresAt ? `expires ${draft.expiresAt}` : "no expiry";
  const scopes = draft.scopes.length > 0 ? draft.scopes.join(", ") : "(no scopes)";
  return `${draft.consentType || "(no type)"} · ${scopes} · ${expiry}`;
}

/** Enumerated consent types — exposed for UI dropdowns. */
export const CONSENT_TYPES = ALLOWED_TYPES;
/** Enumerated scope tags — exposed for UI multi-select. */
export const CONSENT_SCOPES = Array.from(ALLOWED_SCOPES);

/** Fixtures used by tests + Storybook stubs. */
export const fixtures = {
  draftValid: {
    patientId: "patient-123",
    consentType: "data_processing" as ConsentType,
    scopes: ["demographics", "clinical_notes"],
    expiresAt: "",
  } satisfies ConsentDraft,
  draftWithExpiry: {
    patientId: "patient-123",
    consentType: "research" as ConsentType,
    scopes: ["lab_results"],
    expiresAt: "2030-01-01",
  } satisfies ConsentDraft,
  draftMissingType: {
    patientId: "patient-123",
    consentType: "" as const,
    scopes: ["demographics"],
    expiresAt: "",
  } satisfies ConsentDraft,
  draftInvalidScope: {
    patientId: "patient-123",
    consentType: "sharing" as ConsentType,
    scopes: ["something_unknown"],
    expiresAt: "",
  } satisfies ConsentDraft,
};
