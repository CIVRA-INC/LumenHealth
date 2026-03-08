import { z } from "zod";

export const routeQueueEncounterParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Queue encounter id must be a valid ObjectId"),
});

export const routeQueueEncounterBodySchema = z.object({
  queueStatus: z.enum(["WAITING", "TRIAGE", "CONSULTATION"]),
});

export const queueStreamQuerySchema = z.object({
  token: z.string().min(1, "token is required"),
});

export type RouteQueueEncounterParamsDto = z.infer<typeof routeQueueEncounterParamsSchema>;
export type RouteQueueEncounterBodyDto = z.infer<typeof routeQueueEncounterBodySchema>;
export type QueueStreamQueryDto = z.infer<typeof queueStreamQuerySchema>;
