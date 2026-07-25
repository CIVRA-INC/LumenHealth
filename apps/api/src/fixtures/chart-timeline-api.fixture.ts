import type { TimelineFixtureSeed } from '@qyou/shared';

export const mockApiChartTimelineFixture: TimelineFixtureSeed = {
  seedId: 'api_seed_002',
  patientId: 'patient_101',
  mockEvents: [
    {
      eventId: 'evt_301',
      category: 'lab_result',
      title: 'Lipid Panel Laboratory Results',
      timestamp: '2026-07-25T11:15:00Z',
    },
  ],
};
