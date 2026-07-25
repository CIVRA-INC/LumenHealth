export type ConsentFormStep = 'review_terms' | 'configure_scopes' | 'digital_signature' | 'confirmation';

export interface PrivacyPreferenceToggle {
  scopeKey: string;
  isEnabled: boolean;
}

export interface ConsentSignaturePayload {
  patientId: string;
  signatureDataUrl: string;
  toggles: PrivacyPreferenceToggle[];
}
