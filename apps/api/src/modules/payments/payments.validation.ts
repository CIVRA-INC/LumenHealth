import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  clinicId: z.string().trim().min(1, "clinicId is required"),
  amount: z.string().trim().regex(/^\d+(\.\d+)?$/, "amount must be numeric"),
});

export const paymentIntentStatusParamsSchema = z.object({
  intentId: z.string().trim().min(1, "intentId is required"),
});

export type CreatePaymentIntentDto = z.infer<typeof createPaymentIntentSchema>;
export type PaymentIntentStatusParamsDto = z.infer<typeof paymentIntentStatusParamsSchema>;
