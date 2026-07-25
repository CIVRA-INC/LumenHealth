import type { TimelineFixtureSeed } from '@qyou/shared';

export const mockWebChartTimelineFixture: TimelineFixtureSeed = {
  seedId: 'web_seed_001',
  patientId: 'patient_101',
  mockEvents: [
    {
      eventId: 'evt_201',
      category: 'consultation',
      title: 'General Practitioner Consultation',
      timestamp: '2026-07-25T14:30:00Z',
    },
    {
      eventId: 'evt_202',
      category: 'vitals',
      title: 'Blood Pressure & Heart Rate Monitoring',
      timestamp: '2026-07-25T15:00:00Z',
    },
  ],
};
