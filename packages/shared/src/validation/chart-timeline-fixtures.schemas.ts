import { z } from 'zod';

export const mockTimelineEventItemSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required.'),
  category: z.string().min(1, 'Category is required.'),
  title: z.string().min(1, 'Title is required.'),
  timestamp: z.string().min(1),
});

export const timelineFixtureSeedSchema = z.object({
  seedId: z.string().min(1),
  patientId: z.string().min(1),
  mockEvents: z.array(mockTimelineEventItemSchema).min(1, 'At least one mock event is required.'),
});

export type TimelineFixtureSeedInput = z.infer<typeof timelineFixtureSeedSchema>;
