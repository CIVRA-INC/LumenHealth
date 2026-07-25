import { z } from 'zod';

export const privacyConsentPolicySchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  scope: z.string().min(1, 'Scope is required.'),
  isGranted: z.boolean(),
  expiresAt: z.string().optional(),
});

export const consentCheckResultSchema = z.object({
  isPermitted: z.boolean(),
  reason: z.string().optional(),
  evaluatedAt: z.string().min(1),
});

export type PrivacyConsentPolicyInput = z.infer<typeof privacyConsentPolicySchema>;
export type ConsentCheckResultInput = z.infer<typeof consentCheckResultSchema>;
