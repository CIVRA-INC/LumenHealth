import { z } from "zod";

export const streamSummaryQuerySchema = z.object({
  encounterId: z.string().trim().min(1, "encounterId is required"),
});

export type StreamSummaryQueryDto = z.infer<typeof streamSummaryQuerySchema>;
