import {
  timelineApiResponseEnvelopeSchema,
  type TimelineApiResponseEnvelope,
} from '@qyou/shared';

export class ChartTimelineController {
  public async getPatientTimeline(patientId: string): Promise<TimelineApiResponseEnvelope> {
    const payload: TimelineApiResponseEnvelope = {
      success: true,
      events: [
        {
          eventId: 'evt_501',
          patientId,
          category: 'consultation',
          title: 'Initial Health Assessment',
          summary: 'Patient presented for annual wellness visit.',
          timestamp: new Date().toISOString(),
        },
      ],
      totalCount: 1,
    };

    return timelineApiResponseEnvelopeSchema.parse(payload);
  }
}
