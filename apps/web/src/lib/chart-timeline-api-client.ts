import {
  timelineApiResponseEnvelopeSchema,
  type TimelineApiResponseEnvelope,
} from '@qyou/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchPatientTimeline(patientId: string): Promise<TimelineApiResponseEnvelope> {
  const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/timeline`);
  const data = await response.json();
  return timelineApiResponseEnvelopeSchema.parse(data);
}
