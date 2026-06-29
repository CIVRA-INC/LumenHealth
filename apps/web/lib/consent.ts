export type ConsentStatus = "granted" | "revoked" | "expired";

export type ConsentRecord = {
  id: string;
  consentType: string;
  status: ConsentStatus;
  grantedAt: string;
  expiresAt: string | null;
  scope: string;
};

export type PrivacySettings = {
  shareWithProvider: boolean;
  shareWithInsurer: boolean;
  shareForResearch: boolean;
  allowEmergencyAccess: boolean;
  dataRetentionDays: number;
};

export function formatConsentSummary(record: ConsentRecord): string {
  const expiry = record.expiresAt ? `expires ${new Date(record.expiresAt).toLocaleDateString()}` : "no expiry";
  return `${record.consentType}: ${record.status} (${expiry}) — ${record.scope}`;
}

export function isConsentActive(record: ConsentRecord): boolean {
  if (record.status !== "granted") return false;
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) return false;
  return true;
}

export function defaultPrivacySettings(): PrivacySettings {
  return { shareWithProvider: true, shareWithInsurer: true, shareForResearch: false, allowEmergencyAccess: true, dataRetentionDays: 365 };
}

export function validatePrivacySettings(s: Partial<PrivacySettings>): string[] {
  const e: string[] = [];
  if (s.dataRetentionDays !== undefined && (s.dataRetentionDays < 30 || s.dataRetentionDays > 3650))
    e.push("dataRetentionDays must be between 30 and 3650");
  return e;
}

export const fixtures = {
  activeConsent: { id: "cns_01", consentType: "data-sharing", status: "granted" as ConsentStatus, grantedAt: "2026-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z", scope: "vitals" },
  expiredConsent: { id: "cns_02", consentType: "marketing", status: "granted" as ConsentStatus, grantedAt: "2025-01-01T00:00:00Z", expiresAt: "2025-06-01T00:00:00Z", scope: "email" },
  revokedConsent: { id: "cns_03", consentType: "research", status: "revoked" as ConsentStatus, grantedAt: "2026-01-01T00:00:00Z", expiresAt: null, scope: "genetic data" },
};
