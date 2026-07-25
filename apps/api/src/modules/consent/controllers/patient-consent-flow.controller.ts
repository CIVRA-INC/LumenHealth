import {
  consentSignaturePayloadSchema,
  type ConsentSignaturePayloadInput,
} from '@qyou/shared';

export class PatientConsentFlowController {
  public async submitSignature(input: ConsentSignaturePayloadInput) {
    const validated = consentSignaturePayloadSchema.parse(input);
    return {
      consentId: `cns_sig_${Date.now()}`,
      patientId: validated.patientId,
      status: 'signed',
      submittedAt: new Date().toISOString(),
    };
  }
}
