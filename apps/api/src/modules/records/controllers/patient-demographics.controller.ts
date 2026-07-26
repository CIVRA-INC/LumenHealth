import type { Request, Response } from "express";
import { patientDemographicsService } from "../services/patient-demographics.service.js";

export function getDemographics(req: Request, res: Response): void {
  const { patientId } = req.params;
  const clinicId = req.auth?.clinicId;
  if (!clinicId) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "authentication required" });
    return;
  }
  const record = patientDemographicsService.getDemographics(patientId);
  if (!record || record.clinicId !== clinicId) {
    res.status(404).json({ success: false, error: "PATIENT_NOT_FOUND" });
    return;
  }
  res.json({ success: true, data: record });
}

export function updateDemographics(req: Request, res: Response): void {
  const { patientId } = req.params;
  const clinicId = req.auth?.clinicId;
  if (!clinicId) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "authentication required" });
    return;
  }
  try {
    const updated = patientDemographicsService.updateDemographics(patientId, clinicId, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: "PATIENT_NOT_FOUND" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid input";
    res.status(400).json({ success: false, error: message });
  }
}

export function createPatient(req: Request, res: Response): void {
  const clinicId = req.auth?.clinicId;
  if (!clinicId) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "authentication required" });
    return;
  }
  try {
    const created = patientDemographicsService.createPatient(clinicId, req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid input";
    res.status(400).json({ success: false, error: message });
  }
}

export function listPatients(req: Request, res: Response): void {
  const clinicId = req.auth?.clinicId;
  if (!clinicId) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "authentication required" });
    return;
  }
  const patients = patientDemographicsService.listPatients(clinicId);
  res.json({ success: true, data: { patients, totalCount: patients.length } });
}
