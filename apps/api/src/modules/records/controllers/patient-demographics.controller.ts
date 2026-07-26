import type { Request, Response } from "express";
import {
  patientDemographicRecordSchema,
  type PatientDemographicRecordInput,
} from "@qyou/shared";
import {
  createPatient,
  getPatient,
  updateDemographics,
  listPatients,
} from "../services/patient-demographics.service.js";

export function list(req: Request, res: Response): void {
  const clinicId = req.auth!.clinicId;
  const patients = listPatients(clinicId);
  res.json({ patients, total: patients.length });
}

export function getOne(req: Request, res: Response): void {
  const clinicId = req.auth!.clinicId;
  const patientId = String(req.params.patientId);
  const patient = getPatient(patientId, clinicId);

  if (!patient) {
    res.status(404).json({
      error: "PATIENT_NOT_FOUND",
      message: "patient not found in your clinic",
    });
    return;
  }

  res.json({ patient });
}

export function create(req: Request, res: Response): void {
  const clinicId = req.auth!.clinicId;

  const parsed = patientDemographicRecordSchema.safeParse({
    ...req.body,
    patientId: "placeholder",
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    res.status(400).json({
      error: "VALIDATION_FAILED",
      message: firstError?.message ?? "Invalid input",
      field: firstError?.path.join("."),
    });
    return;
  }

  try {
    const patient = createPatient(clinicId, req.body);
    res.status(201).json({ patient });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create patient";
    res.status(400).json({ error: "CREATE_FAILED", message });
  }
}

export function patch(req: Request, res: Response): void {
  const clinicId = req.auth!.clinicId;
  const patientId = String(req.params.patientId);

  const patient = updateDemographics(patientId, clinicId, req.body);

  if (!patient) {
    res.status(404).json({
      error: "PATIENT_NOT_FOUND",
      message: "patient not found in your clinic",
    });
    return;
  }

  res.json({ patient });
}
