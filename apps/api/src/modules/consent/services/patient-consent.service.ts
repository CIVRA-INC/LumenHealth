import {
  consentGrantPayloadSchema,
  type ConsentGrantPayloadInput,
  type ConsentRevocationResult,
} from '@qyou/shared';

export class PatientConsentService {
  public async grantConsent(input: ConsentGrantPayloadInput) {
    const validated = consentGrantPayloadSchema.parse(input);
    return {
      consentId: `cns_${Date.now()}`,
      patientId: validated.patientId,
      scope: validated.scope,
      status: 'granted',
      grantedAt: validated.signedTimestamp,
    };
  }

  public async revokeConsent(consentId: string): Promise<ConsentRevocationResult> {
    return {
      consentId,
      revokedAt: new Date().toISOString(),
      effectiveImmediately: true,
    };
  }
}
