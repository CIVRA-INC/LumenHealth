import type { PatientErrorCode } from "@lumen/types";

/**
 * Maps the package-level `PatientErrorCode` (see packages/types/src/patient.ts
 * — established in the patient records foundation #610 / #737 / #738 / #739)
 * to user-facing copy that the patient UI surfaces in the same `authStatus`
 * panel pattern used by `AuthScreen`.
 *
 * Inline validation failures (HTTP 400) come back with
 * `{ error: "PATIENT_INVALID_INPUT", message, field }` — the `field`
 * property drills down to the offending form field, which we wire to
 * `<PatientField>` inline errors.
 */
export const patientErrorCopy: Record<PatientErrorCode, string> = {
  PATIENT_NOT_FOUND: "We couldn't find that patient.",
  PATIENT_IDENTIFIER_TAKEN:
    "That medical record number is already in use for this clinic.",
  PATIENT_ACCESS_DENIED: "You don't have access to that patient.",
  PATIENT_INVALID_INPUT: "Please review the highlighted field.",
};

export type ParsedPatientError = {
  error: PatientErrorCode;
  message: string;
  field?: string;
};

function isPatientErrorCode(value: unknown): value is PatientErrorCode {
  return (
    typeof value === "string" &&
    (value === "PATIENT_NOT_FOUND" ||
      value === "PATIENT_IDENTIFIER_TAKEN" ||
      value === "PATIENT_ACCESS_DENIED" ||
      value === "PATIENT_INVALID_INPUT")
  );
}

/**
 * Parse an unknown response body into a typed `ParsedPatientError`,
 * falling back to `fallback` when the body is not a recognisable
 * PatientError envelope. This mirrors `parseAuthError` from
 * `apps/web/app/auth/_components/auth-screen.tsx`.
 */
export function parsePatientError(
  body: unknown,
  fallback: PatientErrorCode,
): ParsedPatientError {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    isPatientErrorCode((body as { error: unknown }).error)
  ) {
    const candidate = body as {
      error: PatientErrorCode;
      message?: unknown;
      field?: unknown;
    };
    const code = candidate.error;
    const message =
      typeof candidate.message === "string"
        ? candidate.message
        : patientErrorCopy[code];
    const field =
      typeof candidate.field === "string" ? candidate.field : undefined;
    return { error: code, message, field };
  }
  return { error: fallback, message: patientErrorCopy[fallback] };
}
