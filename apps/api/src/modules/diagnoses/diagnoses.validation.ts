import { z } from "zod";

export const diagnosisSearchQuerySchema = z.object({
  q: z.string().trim().min(1),
});

export const encounterDiagnosisParamsSchema = z.object({
  encounterId: z.string().trim().min(1),
});

export const attachDiagnosisSchema = z.object({
  code: z.string().trim().min(3),
  description: z.string().trim().min(3),
  status: z.enum(["SUSPECTED", "CONFIRMED", "RESOLVED"]).default("CONFIRMED"),
});

export const diagnosisIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const updateDiagnosisStatusSchema = z.object({
  status: z.enum(["SUSPECTED", "CONFIRMED", "RESOLVED"]),
});

export type DiagnosisSearchQueryDto = z.infer<typeof diagnosisSearchQuerySchema>;
export type EncounterDiagnosisParamsDto = z.infer<typeof encounterDiagnosisParamsSchema>;
export type AttachDiagnosisDto = z.infer<typeof attachDiagnosisSchema>;
export type DiagnosisIdParamsDto = z.infer<typeof diagnosisIdParamsSchema>;
export type UpdateDiagnosisStatusDto = z.infer<typeof updateDiagnosisStatusSchema>;
