export type ConsentStatus = 'granted' | 'revoked' | 'pending';

export type ConsentScopeOption = 'medical_history' | 'data_sharing' | 'research_analytics' | 'marketing';

export interface PatientConsentRecord {
  consentId: string;
  patientId: string;
  scope: ConsentScopeOption;
  status: ConsentStatus;
  grantedAt?: string;
  expiresAt?: string;
}

export interface ConsentFixtureSeed {
  seedId: string;
  consents: PatientConsentRecord[];
}
