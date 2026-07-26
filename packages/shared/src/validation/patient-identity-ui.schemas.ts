import { z } from 'zod';

export const patientIdentityUIStateSchema = z.object({
  patientId: z.string().nullable(),
  isLoading: z.boolean(),
  activeTab: z.enum(['summary', 'demographics', 'verification']),
  error: z.string().nullable(),
});
