// Consent record types — Sprint 2 / Stellar Wave: patient records.
// Foundation issue: consent and privacy.

export type ConsentType = "data_processing" | "sharing" | "research" | "communications";

export type ConsentStatus = "active" | "revoked" | "expired";

export type ConsentErrorCode =
  | "CONSENT_NOT_FOUND"
  | "CONSENT_INVALID_INPUT";

export type ConsentRecord = {
  id: string;
  patientId: string;
  clinicId: string;
  type: ConsentType;
  status: ConsentStatus;
  grantedAt: string;
  revokedAt?: string;
  expiresAt?: string;
  scope: string[];
};

export type GrantConsentRequest = {
  type: ConsentType;
  scope: string[];
};

export type ConsentError = {
  error: ConsentErrorCode;
  message: string;
};
