import { z } from "zod";

export const createAiDraftSchema = z.object({
  encounterId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(20_000),
});

export const updateAiDraftSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export const approveAiDraftSchema = z.object({
  content: z.string().trim().min(1).max(20_000).optional(),
});

export const aiDraftIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export type CreateAiDraftDto = z.infer<typeof createAiDraftSchema>;
export type UpdateAiDraftDto = z.infer<typeof updateAiDraftSchema>;
export type ApproveAiDraftDto = z.infer<typeof approveAiDraftSchema>;
export type AiDraftIdParamsDto = z.infer<typeof aiDraftIdParamsSchema>;

