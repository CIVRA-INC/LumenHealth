import { z } from 'zod';

export const timelineEventContractSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required.'),
  patientId: z.string().min(1, 'Patient ID is required.'),
  category: z.string().min(1, 'Category is required.'),
  title: z.string().min(1, 'Title is required.'),
  summary: z.string(),
  timestamp: z.string().min(1),
});

export const timelineApiResponseEnvelopeSchema = z.object({
  success: z.boolean(),
  events: z.array(timelineEventContractSchema),
  totalCount: z.number().int().min(0),
});

export type TimelineEventContractInput = z.infer<typeof timelineEventContractSchema>;
export type TimelineApiResponseEnvelopeInput = z.infer<typeof timelineApiResponseEnvelopeSchema>;
