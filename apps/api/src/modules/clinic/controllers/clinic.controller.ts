import type { Request, Response } from "express";
import type { CreateClinicRequest, UpdateClinicRequest } from "@lumen/types";
import { validateCreateClinic, validateUpdateClinic } from "../validators/clinic.validator.js";
import {
  createClinic,
  getClinic,
  updateClinic,
  archiveClinic,
} from "../services/clinic.service.js";

export function create(req: Request, res: Response): void {
  const validation = validateCreateClinic(req.body);
  if (!validation.ok) {
    res.status(400).json({
      error: "CLINIC_INVALID_INPUT",
      message: validation.message,
      field: validation.field,
    });
    return;
  }

  const body = req.body as CreateClinicRequest;
  const clinic = createClinic(body, req.auth!.userId, req.auth!.clinicId);
  res.status(201).json({ clinic });
}

export function get(req: Request, res: Response): void {
  const clinic = getClinic(req.params.clinicId, req.auth!.clinicId);
  if (!clinic) {
    res.status(404).json({ error: "CLINIC_NOT_FOUND", message: "clinic not found" });
    return;
  }
  res.json({ clinic });
}

export function update(req: Request, res: Response): void {
  const validation = validateUpdateClinic(req.body);
  if (!validation.ok) {
    res.status(400).json({
      error: "CLINIC_INVALID_INPUT",
      message: validation.message,
      field: validation.field,
    });
    return;
  }

  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "insufficient role" });
    return;
  }

  const patch = req.body as UpdateClinicRequest;
  const clinic = updateClinic(req.params.clinicId, req.auth!.clinicId, patch);
  if (!clinic) {
    res.status(404).json({ error: "CLINIC_NOT_FOUND", message: "clinic not found" });
    return;
  }
  res.json({ clinic });
}

export function archive(req: Request, res: Response): void {
  if (req.auth!.role !== "owner") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only the owner may archive a clinic" });
    return;
  }

  const clinic = archiveClinic(req.params.clinicId, req.auth!.clinicId);
  if (!clinic) {
    res.status(404).json({ error: "CLINIC_NOT_FOUND", message: "clinic not found" });
    return;
  }
  res.json({ ok: true });
}
