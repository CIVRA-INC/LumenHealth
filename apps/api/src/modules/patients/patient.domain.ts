/**
 * Patient domain model and invariants.
 * Defines aggregate boundaries, status transitions, and business rules
 * for patient registration and search within a clinic tenant.
 */

export type PatientSex = "M" | "F" | "O";

export type PatientStatus = "active" | "inactive" | "merged" | "deceased";

export interface PatientIdentity {
  systemId: string;   // LMN-XXXX, immutable after creation
  clinicId: string;   // tenant boundary — never cross-clinic reads
}

export interface PatientDemographics {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: PatientSex;
  contactNumber: string;
  address: string;
}

export interface PatientAggregate extends PatientIdentity, PatientDemographics {
  status: PatientStatus;
  createdBy: string;  // actor provenance
  updatedBy: string;
}

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

/** Minimum age in years for a registerable patient. */
const MIN_AGE_YEARS = 0;

/** Maximum plausible age — guards against data-entry errors. */
const MAX_AGE_YEARS = 130;

export function assertValidDateOfBirth(dob: Date): void {
  const now = new Date();
  const ageMs = now.getTime() - dob.getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  if (ageYears < MIN_AGE_YEARS || ageYears > MAX_AGE_YEARS) {
    throw new Error(`Date of birth out of plausible range (0–${MAX_AGE_YEARS} years).`);
  }
}

export function assertValidStatus(
  current: PatientStatus,
  next: PatientStatus,
): void {
  const forbidden: Partial<Record<PatientStatus, PatientStatus[]>> = {
    merged: ["active", "inactive"],
    deceased: ["active", "inactive", "merged"],
  };
  if (forbidden[current]?.includes(next)) {
    throw new Error(`Cannot transition patient from "${current}" to "${next}".`);
  }
}

/** Normalise a name fragment for fuzzy search indexing. */
export function normaliseSearchToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
