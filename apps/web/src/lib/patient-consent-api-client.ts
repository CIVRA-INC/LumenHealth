import {
  consentApiEnvelopeSchema,
  type ConsentStatusApiResponse,
} from '@qyou/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchPatientConsentStatus(patientId: string): Promise<ConsentStatusApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/consent`);
  const raw = await response.json();
  const envelope = consentApiEnvelopeSchema.parse(raw);

  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.error ?? 'Failed to retrieve patient consent status');
  }

  return envelope.data;
}
