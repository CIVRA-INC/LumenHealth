import { z } from 'zod';

export const patientIdentityModelSchema = z.object({
  id: z.string().uuid(),
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
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const patientRecordHeaderSchema = z.object({
  patientId: z.string().uuid(),
  status: z.enum(['active', 'archived', 'pending_verification']),
  primaryClinicId: z.string().uuid(),
});
