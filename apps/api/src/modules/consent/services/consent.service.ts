import { randomUUID } from "crypto";
import type {
  ConsentRecord,
  GrantConsentRequest,
  ConsentError,
} from "@lumen/types";
import {
  save,
  findById,
  listByPatient,
  remove,
} from "../repositories/consent.repository.js";

export function grantConsent(
  patientId: string,
  clinicId: string,
  req: GrantConsentRequest,
): ConsentRecord {
  const now = new Date().toISOString();
  const record: ConsentRecord = {
    id: randomUUID(),
    patientId,
    clinicId,
    type: req.type,
    status: "active",
    grantedAt: now,
    scope: req.scope,
  };
  return save(record);
}

export function listConsents(patientId: string): ConsentRecord[] {
  return listByPatient(patientId);
}

export function revokeConsent(
  consentId: string,
  patientId: string,
  clinicId: string,
): ConsentRecord | ConsentError {
  const record = findById(consentId);
  if (!record || record.patientId !== patientId || record.clinicId !== clinicId) {
    return { error: "CONSENT_NOT_FOUND", message: "consent record not found" };
  }
  const updated: ConsentRecord = {
    ...record,
    status: "revoked",
    revokedAt: new Date().toISOString(),
  };
  return save(updated);
}
