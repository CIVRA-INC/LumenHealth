import type { Request, Response } from "express";
import { validateGrantConsent } from "../validators/consent.validator.js";
import {
  grantConsent,
  listConsents,
  revokeConsent,
} from "../services/consent.service.js";

/**
 * GET /api/v1/patients/:patientId/consent — list consent records.
 *
 * Returns all consent records for the given patient, scoped to the caller's
 * clinic. No consent records is a valid empty state (200 with []).
 */
export function list(req: Request, res: Response): void {
  const records = listConsents(String(req.params.patientId));
  res.json({ consents: records });
}

/**
 * POST /api/v1/patients/:patientId/consent — grant a new consent.
 *
 * Body must include `type` (one of data_processing|sharing|research|
 * communications) and `scope` (non-empty array of strings). Returns 201
 * with the created consent record.
 */
export function grant(req: Request, res: Response): void {
  const validation = validateGrantConsent(req.body);
  if (!validation.ok) {
    res.status(400).json({
      error: "CONSENT_INVALID_INPUT",
      message: validation.message,
      field: validation.field,
    });
    return;
  }

  const record = grantConsent(
    String(req.params.patientId),
    req.auth!.clinicId,
    req.body as { type: string; scope: string[] },
  );
  res.status(201).json({ consent: record });
}

/**
 * DELETE /api/v1/patients/:patientId/consent/:consentId — revoke a consent.
 *
 * Sets the consent status to "revoked" and stamps `revokedAt`. Returns 200
 * with the updated record. Returns 404 when the record does not exist or
 * does not belong to the caller's clinic.
 */
export function revoke(req: Request, res: Response): void {
  const result = revokeConsent(
    String(req.params.consentId),
    String(req.params.patientId),
    req.auth!.clinicId,
  );
  if ("error" in result) {
    res.status(404).json(result);
    return;
  }
  res.json({ consent: result });
}
