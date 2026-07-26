import { z } from 'zod';

export const patientIdentityContractResponseSchema = z.object({
  id: z.string(),
  nationalId: z.string(),
  fullName: z.string(),
  status: z.string(),
  verified: z.boolean(),
});

export const patientIdentityContractQuerySchema = z.object({
  nationalId: z.string().optional(),
  clinicId: z.string().optional(),
});
