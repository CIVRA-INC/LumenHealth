// Patient master record types — Sprint 2 / Stellar Wave: patient identity.
// Foundation issue: data model. Closes #610.

export type PatientStatus = "active" | "inactive" | "archived";

export type Patient = {
  patientId: string;
  clinicId: string;
  /** External / clinical identifier (e.g. medical record number). Unique per clinic. */
  identifier: string;
  givenName: string;
  familyName: string;
  /** ISO-8601 date (YYYY-MM-DD). */
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreatePatientRequest = {
  identifier: string;
  givenName: string;
  familyName: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
};

export type UpdatePatientRequest = Partial<
  Pick<
    Patient,
    "givenName" | "familyName" | "phone" | "email" | "address" | "status"
  >
>;

export type PatientListItem = Pick<
  Patient,
  | "patientId"
  | "clinicId"
  | "identifier"
  | "givenName"
  | "familyName"
  | "status"
>;

// ── Errors ────────────────────────────────────────────────────────────────────

export type PatientErrorCode =
  | "PATIENT_NOT_FOUND"
  | "PATIENT_IDENTIFIER_TAKEN"
  | "PATIENT_ACCESS_DENIED"
  | "PATIENT_INVALID_INPUT";

export type PatientError = {
  error: PatientErrorCode;
  message: string;
};
