import { z } from 'zod';

export const eventCategorySchema = z.enum(['vitals', 'consultation', 'lab_result', 'immunization', 'surgery']);

export const timelineQueryFilterSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  categories: z.array(eventCategorySchema).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

export type TimelineQueryFilterInput = z.infer<typeof timelineQueryFilterSchema>;
