import { z } from "zod";

export const createEncounterSchema = z.object({
  patientId: z.string().trim().min(1).optional(),
});

export const encounterIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Encounter id must be a valid ObjectId"),
});

export type CreateEncounterDto = z.infer<typeof createEncounterSchema>;
export type EncounterIdParamsDto = z.infer<typeof encounterIdParamsSchema>;
