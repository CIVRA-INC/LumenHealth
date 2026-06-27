import type { Request, Response } from "express";
import type {
  CreatePatientRequest,
  UpdatePatientRequest,
} from "@lumen/types";
import {
  validateCreatePatient,
  validateUpdatePatient,
} from "../validators/patient.validator.js";
import {
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
  archivePatient,
} from "../services/patient.service.js";

/**
 * POST /api/v1/patients — create a patient.
 *
 * Permission: `patient:write` (owner, admin, clinician). Body shape is
 * validated upstream of the controller via `validateCreatePatient`;
 * identifier-uniqueness is enforced at the service layer. Successful
 * creation returns 201 with the new patient. A duplicate identifier
 * surfaces as 409 with the package-level `PatientError` envelope.
 */
export function create(req: Request, res: Response): void {
  const validation = validateCreatePatient(req.body);
  if (!validation.ok) {
    res.status(400).json({
      error: "PATIENT_INVALID_INPUT",
      message: validation.message,
      field: validation.field,
    });
    return;
  }

  const result = createPatient(
    req.body as CreatePatientRequest,
    req.auth!.clinicId,
  );
  if ("error" in result) {
    res.status(409).json(result);
    return;
  }
  res.status(201).json({ patient: result });
}

/**
 * GET /api/v1/patients — list patients in the caller's clinic.
 *
 * Permission: `patient:read`. Returns the sanitized `PatientListPage`
 * shape (no PII). Limit/offset query params are parsed via
 * `parseNonNegativeInt` and forwarded to the service (which clamps to
 * 1..50 internally).
 */
export function list(req: Request, res: Response): void {
  const limit = parseNonNegativeInt(req.query.limit);
  const offset = parseNonNegativeInt(req.query.offset);
  const opts: { limit?: number; offset?: number } = {};
  if (limit !== undefined) opts.limit = limit;
  if (offset !== undefined) opts.offset = offset;

  const page = listPatients(req.auth!.clinicId, opts);
  res.json(page);
}

/**
 * GET /api/v1/patients/:patientId — read a patient.
 *
 * Permission: `patient:read`. Clinic-isolation is enforced at the service
 * layer (callerClinicId match); cross-clinic access surfaces as 404 to
 * avoid existence enumeration.
 */
export function get(req: Request, res: Response): void {
  const patient = getPatient(
    String(req.params.patientId),
    req.auth!.clinicId,
  );
  if (!patient) {
    res.status(404).json({
      error: "PATIENT_NOT_FOUND",
      message: "patient not found",
    });
    return;
  }
  res.json({ patient });
}

/**
 * PATCH /api/v1/patients/:patientId — update a patient.
 *
 * Permission: `patient:write`. Body shape validated upstream; identifier
 * is not patchable via `UpdatePatientRequest`.
 */
export function update(req: Request, res: Response): void {
  const validation = validateUpdatePatient(req.body);
  if (!validation.ok) {
    res.status(400).json({
      error: "PATIENT_INVALID_INPUT",
      message: validation.message,
      field: validation.field,
    });
    return;
  }

  const patient = updatePatient(
    String(req.params.patientId),
    req.auth!.clinicId,
    req.body as UpdatePatientRequest,
  );
  if (!patient) {
    res.status(404).json({
      error: "PATIENT_NOT_FOUND",
      message: "patient not found",
    });
    return;
  }
  res.json({ patient });
}

/**
 * DELETE /api/v1/patients/:patientId — archive a patient (soft delete).
 *
 * Permission: `patient:write` (any role with patient:write can call this
 * route; the inline role-check below restricts the action to owner/admin
 * only). Archiving sets `status='archived'` and stamps `archivedAt`; the
 * record is not hard-deleted.
 */
export function archive(req: Request, res: Response): void {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({
      error: "AUTH_FORBIDDEN",
      message: "only owner or admin may archive a patient",
    });
    return;
  }

  const patient = archivePatient(
    String(req.params.patientId),
    req.auth!.clinicId,
  );
  if (!patient) {
    res.status(404).json({
      error: "PATIENT_NOT_FOUND",
      message: "patient not found",
    });
    return;
  }
  res.status(200).json({ patient });
}

function parseNonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}
