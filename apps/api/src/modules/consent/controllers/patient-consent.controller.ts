import {
  consentApiEnvelopeSchema,
  type ConsentApiEnvelope,
} from '@qyou/shared';

export class PatientConsentController {
  public async getConsentStatus(patientId: string): Promise<ConsentApiEnvelope> {
    const payload: ConsentApiEnvelope = {
      success: true,
      data: {
        patientId,
        hasActiveConsent: true,
        scopes: [
          { scopeName: 'medical_history', isGranted: true, effectiveDate: new Date().toISOString() },
        ],
      },
    };
    return consentApiEnvelopeSchema.parse(payload);
  }
}
