export type EventCategory = 'vitals' | 'consultation' | 'lab_result' | 'immunization' | 'surgery';

export interface TimelineEvent {
  eventId: string;
  patientId: string;
  category: EventCategory;
  title: string;
  summaryDescription: string;
  occurredAt: string;
  practitionerName?: string;
}

export interface TimelineQueryFilter {
  patientId: string;
  categories?: EventCategory[];
  startDate?: string;
  endDate?: string;
  limit?: number;
}
