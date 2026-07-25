export interface PrivacyScopeSummary {
  scopeName: string;
  isGranted: boolean;
  effectiveDate: string;
}

export interface ConsentStatusApiResponse {
  patientId: string;
  hasActiveConsent: boolean;
  scopes: PrivacyScopeSummary[];
}

export interface ConsentApiEnvelope {
  success: boolean;
  data?: ConsentStatusApiResponse;
  error?: string;
}
