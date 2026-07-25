import { z } from 'zod';

export const eventSeverityLevelSchema = z.enum(['routine', 'important', 'critical']);

export const categorySummaryCountSchema = z.object({
  category: z.string().min(1),
  count: z.number().int().min(0),
});

export const timelineAggregationResultSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  totalEventsCount: z.number().int().min(0),
  categoryBreakdown: z.array(categorySummaryCountSchema),
  hasCriticalEvents: z.boolean(),
});

export type TimelineAggregationResultInput = z.infer<typeof timelineAggregationResultSchema>;
