import { z } from "zod";

export const encounterAlertsParamsSchema = z.object({
  encounterId: z.string().trim().min(1),
});

export const alertIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export type EncounterAlertsParamsDto = z.infer<typeof encounterAlertsParamsSchema>;
export type AlertIdParamsDto = z.infer<typeof alertIdParamsSchema>;

