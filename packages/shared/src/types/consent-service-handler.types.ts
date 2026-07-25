export interface PrivacyConsentPolicy {
  patientId: string;
  scope: string;
  isGranted: boolean;
  expiresAt?: string;
}

export interface ConsentCheckResult {
  isPermitted: boolean;
  reason?: string;
  evaluatedAt: string;
}
