import { z } from 'zod';

export const privacyScopeSummarySchema = z.object({
  scopeName: z.string().min(1, 'Scope name is required.'),
  isGranted: z.boolean(),
  effectiveDate: z.string().min(1),
});

export const consentStatusApiResponseSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  hasActiveConsent: z.boolean(),
  scopes: z.array(privacyScopeSummarySchema),
});

export const consentApiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: consentStatusApiResponseSchema.optional(),
  error: z.string().optional(),
});

export type ConsentStatusApiResponseInput = z.infer<typeof consentStatusApiResponseSchema>;
export type ConsentApiEnvelopeInput = z.infer<typeof consentApiEnvelopeSchema>;
