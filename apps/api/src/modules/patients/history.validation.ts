import { z } from "zod";

export const patientHistoryParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const patientHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(25).default(5),
});

export type PatientHistoryParamsDto = z.infer<typeof patientHistoryParamsSchema>;
export type PatientHistoryQueryDto = z.infer<typeof patientHistoryQuerySchema>;
