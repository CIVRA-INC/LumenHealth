import { z } from 'zod';

export const consentStatusSchema = z.enum(['granted', 'revoked', 'pending']);
export const consentScopeOptionSchema = z.enum(['medical_history', 'data_sharing', 'research_analytics', 'marketing']);

export const patientConsentRecordSchema = z.object({
  consentId: z.string().min(1, 'Consent ID is required.'),
  patientId: z.string().min(1, 'Patient ID is required.'),
  scope: consentScopeOptionSchema,
  status: consentStatusSchema,
  grantedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type PatientConsentRecordInput = z.infer<typeof patientConsentRecordSchema>;
