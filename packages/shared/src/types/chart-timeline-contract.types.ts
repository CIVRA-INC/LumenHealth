export interface TimelineEventContract {
  eventId: string;
  patientId: string;
  category: string;
  title: string;
  summary: string;
  timestamp: string;
}

export interface TimelineApiResponseEnvelope {
  success: boolean;
  events: TimelineEventContract[];
  totalCount: number;
}
