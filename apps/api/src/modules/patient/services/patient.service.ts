import { randomUUID } from "crypto";
import type {
  Patient,
  PatientStatus,
  PatientErrorCode,
  PatientListPage,
  CreatePatientRequest,
  UpdatePatientRequest,
} from "@lumen/types";
import { patientStore } from "../repositories/patient.repository.js";

/**
 * Create a new patient record in the caller's clinic.
 *
 * Returns the new patient on success, or a typed error envelope
 * (`{ error: PatientErrorCode; message: string }`) when the medical
 * record number is already in use in this clinic.
 *
 * Input shape is treated as already-validated upstream by the controller's
 * call to `validateCreatePatient`; the service does not re-validate.
 *
 * Note: creator-audit is intentionally out of scope for this PR.
 * When `Patient` gains a `createdBy: string` field, plumb it through
 * here (mirrors what `clinicService.createClinic` does with `ownerId`
 * and `Clinic.ownerId`).
 */
export function createPatient(
  req: CreatePatientRequest,
  clinicId: string,
): Patient | { error: PatientErrorCode; message: string } {
  const now = new Date().toISOString();
  const patient: Patient = {
    patientId: randomUUID(),
    clinicId,
    identifier: req.identifier.trim(),
    givenName: req.givenName.trim(),
    familyName: req.familyName.trim(),
    birthDate: req.birthDate,
    phone: req.phone.trim(),
    email: req.email.trim(),
    address: req.address.trim(),
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const result = patientStore.saveStrict(patient);
  if (!result.ok) {
    return { error: result.error, message: result.message };
  }
  return result.patient;
}

/**
 * Fetch a single patient by id, scoped to the caller's clinic.
 * Returns null when the patient does not exist OR belongs to a different
 * clinic (fail-closed cross-clinic isolation).
 */
export function getPatient(
  patientId: string,
  callerClinicId: string,
): Patient | null {
  const patient = patientStore.findById(patientId);
  if (!patient || patient.clinicId !== callerClinicId) return null;
  return patient;
}

/**
 * List patients in the caller's clinic, paginated.
 * Returns the sanitized `PatientListPage` shape (`PatientListItem` entries —
 * no phone / email / address / birthDate), matching the redaction contract
 * established in #614.
 */
export function listPatients(
  callerClinicId: string,
  opts: { limit?: number; offset?: number } = {},
): PatientListPage {
  return patientStore.listPaginated(callerClinicId, opts);
}

/**
 * Decide the next `Patient.archivedAt` value given prior status and the
 * patch's optional status. Maintains the invariant: `archivedAt` is set
 * IFF `status === "archived"`.
 *
 * - No status patch → preserve prior archivedAt.
 * - patch.status === "archived" AND existing was archived → preserve
 *   prior timestamp (first-archive time is sticky for forensics).
 * - patch.status === "archived" AND existing was NOT archived → stamp
 *   now (transition INTO archived).
 * - patch.status !== "archived" AND existing was archived → undefined
 *   (transition OUT clears archivedAt).
 * - patch.status !== "archived" AND existing was NOT archived →
 *   undefined.
 */
function nextArchivedAt(
  existingStatus: PatientStatus,
  existingArchivedAt: string | undefined,
  patchStatus: PatientStatus | undefined,
): string | undefined {
  if (patchStatus === undefined) return existingArchivedAt;
  if (patchStatus === "archived") {
    if (existingStatus === "archived") return existingArchivedAt;
    return new Date().toISOString();
  }
  // patchStatus !== "archived" — either transitioning OUT of archived
  // or staying non-archived; in both cases archivedAt is cleared.
  return undefined;
}

/**
 * Patch a patient record. Strictly clinic-isolated (returns null when the
 * patient is not in the caller's clinic). Identifier is not patchable via
 * `UpdatePatientRequest`.
 *
 * Status ↔ archivedAt transitions (delegated to `nextArchivedAt`):
 * - Transitioning INTO archived stamps archivedAt.
 * - Transitioning OUT of archived clears archivedAt.
 * - Re-applying the same status does not ref-stamp archivedAt.
 */
export function updatePatient(
  patientId: string,
  callerClinicId: string,
  patch: UpdatePatientRequest,
): Patient | null {
  const existing = getPatient(patientId, callerClinicId);
  if (!existing) return null;

  const newArchivedAt = nextArchivedAt(
    existing.status,
    existing.archivedAt,
    patch.status,
  );

  // Drop existing.archivedAt before applying the patch so the field is
  // truly absent (not just undefined-valued) when transitioning OUT.
  const { archivedAt: _, ...rest } = existing;

  const updated: Patient = {
    ...rest,
    ...(patch.givenName ? { givenName: patch.givenName.trim() } : {}),
    ...(patch.familyName ? { familyName: patch.familyName.trim() } : {}),
    ...(patch.phone ? { phone: patch.phone.trim() } : {}),
    ...(patch.email ? { email: patch.email.trim() } : {}),
    ...(patch.address ? { address: patch.address.trim() } : {}),
    ...(patch.status ? { status: patch.status } : {}),
    ...(newArchivedAt !== undefined ? { archivedAt: newArchivedAt } : {}),
    updatedAt: new Date().toISOString(),
  };

  // Identifier is not patched; saveStrict's collision check is unnecessary.
  return patientStore.save(updated);
}

/**
 * Mark a patient as archived (sets `status='archived'`, stamps
 * `archivedAt`). Returns null when the patient is not in the caller's
 * clinic.
 */
export function archivePatient(
  patientId: string,
  callerClinicId: string,
): Patient | null {
  const existing = getPatient(patientId, callerClinicId);
  if (!existing) return null;
  return patientStore.archiveById(patientId);
}
