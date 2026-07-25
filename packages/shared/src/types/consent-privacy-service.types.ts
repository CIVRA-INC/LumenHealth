export interface ConsentGrantPayload {
  patientId: string;
  scope: string;
  agreedToTerms: boolean;
  signedTimestamp: string;
}

export interface ConsentRevocationResult {
  consentId: string;
  revokedAt: string;
  effectiveImmediately: boolean;
}

export interface PrivacyAuditEntry {
  auditId: string;
  patientId: string;
  action: 'grant' | 'revoke' | 'update';
  performedBy: string;
  timestamp: string;
}
