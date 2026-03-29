import { z } from "zod";

export const createEncounterSchema = z.object({
  patientId: z.string().trim().min(1).optional(),
});

export const encounterIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Encounter id must be a valid ObjectId"),
});

export const encounterListQuerySchema = z.object({
  patientId: z.string().trim().min(1).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type CreateEncounterDto = z.infer<typeof createEncounterSchema>;
export type EncounterIdParamsDto = z.infer<typeof encounterIdParamsSchema>;
export type EncounterListQueryDto = z.infer<typeof encounterListQuerySchema>;
