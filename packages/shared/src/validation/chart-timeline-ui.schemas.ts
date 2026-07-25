import { z } from 'zod';

export const timelineViewModeSchema = z.enum(['chronological', 'compact', 'expanded']);

export const timelineFilterStateSchema = z.object({
  searchQuery: z.string().default(''),
  selectedCategory: z.string().optional(),
  viewMode: timelineViewModeSchema.default('chronological'),
});

export const interactiveEventDetailSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required.'),
  fullNotes: z.string(),
  attachmentsCount: z.number().int().min(0),
});

export type TimelineFilterStateInput = z.infer<typeof timelineFilterStateSchema>;
