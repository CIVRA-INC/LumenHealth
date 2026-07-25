export interface MockTimelineEventItem {
  eventId: string;
  category: string;
  title: string;
  timestamp: string;
}

export interface TimelineFixtureSeed {
  seedId: string;
  patientId: string;
  mockEvents: MockTimelineEventItem[];
}

export interface TimelineTestEnvironment {
  seedName: string;
  eventsCount: number;
}
