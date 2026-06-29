export type ConsentStatus = "granted" | "revoked" | "expired";

export type ConsentType = "data-sharing" | "marketing" | "research" | "third-party" | "emergency-contact";

export type ConsentRecord = {
  id: string;
  patientId: string;
  clinicId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  scope: string;
  notes: string;
};

export type PrivacyPreference = {
  patientId: string;
  shareWithProvider: boolean;
  shareWithInsurer: boolean;
  shareForResearch: boolean;
  allowEmergencyAccess: boolean;
  dataRetentionDays: number;
  updatedAt: string;
};

export type ConsentAuditEntry = {
  id: string;
  patientId: string;
  consentId: string;
  action: "grant" | "revoke" | "expire" | "update";
  performedBy: string;
  timestamp: string;
  details: string;
};

const defaultPrivacy: Omit<PrivacyPreference, "patientId" | "updatedAt"> = {
  shareWithProvider: true,
  shareWithInsurer: true,
  shareForResearch: false,
  allowEmergencyAccess: true,
  dataRetentionDays: 365,
};

export function createPrivacyPreference(patientId: string): PrivacyPreference {
  return { patientId, ...defaultPrivacy, updatedAt: new Date().toISOString() };
}

export function validateConsent(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!payload.consentType || !["data-sharing", "marketing", "research", "third-party", "emergency-contact"].includes(payload.consentType as string))
    errors.push("Valid consentType is required");
  if (!payload.scope || typeof payload.scope !== "string") errors.push("scope is required");
  return errors;
}

export function createConsentRecord(
  patientId: string,
  clinicId: string,
  data: { consentType: ConsentType; scope: string; expiresAt?: string; notes?: string },
): ConsentRecord {
  return {
    id: `cns_${Date.now()}`,
    patientId,
    clinicId,
    consentType: data.consentType,
    status: "granted",
    grantedAt: new Date().toISOString(),
    expiresAt: data.expiresAt || null,
    revokedAt: null,
    scope: data.scope,
    notes: data.notes || "",
  };
}

export const fixtures = {
  validConsent: { consentType: "data-sharing" as ConsentType, scope: "share vitals with primary care", expiresAt: "2027-01-01T00:00:00Z", notes: "Annual consent" },
  invalidConsent: { consentType: "invalid-type", scope: "" },
  patientId: "pat_cns_01",
  clinicId: "clinic_cns_01",
};
