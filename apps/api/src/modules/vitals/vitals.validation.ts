import { z } from "zod";

export const createVitalsSchema = z.object({
  encounterId: z.string().trim().min(1).optional(),
  bpSystolic: z.number().min(30).max(300),
  bpDiastolic: z.number().min(20).max(200),
  heartRate: z.number().min(20).max(260),
  temperature: z.number().min(30).max(45),
  respirationRate: z.number().min(5).max(80),
  spO2: z.number().min(40).max(100),
  weight: z.number().min(1).max(500),
});

export const encounterVitalsParamsSchema = z.object({
  encounterId: z.string().trim().min(1),
});

export type CreateVitalsDto = z.infer<typeof createVitalsSchema>;
export type EncounterVitalsParamsDto = z.infer<typeof encounterVitalsParamsSchema>;
