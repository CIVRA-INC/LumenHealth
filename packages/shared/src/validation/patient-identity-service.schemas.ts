import { z } from 'zod';

export const createPatientIdentityInputSchema = z.object({
  nationalId: z.string().min(5),
  fullName: z.string().min(2),
  dateOfBirth: z.string(),
  gender: z.enum(['male', 'female', 'other']),
  bloodGroup: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phoneNumber: z.string(),
  }),
});

export const patientIdentityServiceResultSchema = z.object({
  success: z.boolean(),
  patientId: z.string(),
  status: z.string(),
});
