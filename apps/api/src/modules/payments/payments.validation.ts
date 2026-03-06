import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  clinicId: z.string().trim().min(1),
  amount: z.string().trim().regex(/^\d+(\.\d+)?$/, "amount must be numeric"),
});

export const paymentStatusParamsSchema = z.object({
  intentId: z.string().trim().min(1),
});

export type CreatePaymentIntentDto = z.infer<typeof createPaymentIntentSchema>;
export type PaymentStatusParamsDto = z.infer<typeof paymentStatusParamsSchema>;
