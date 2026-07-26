import { z } from 'zod';

export const patientIdentityStatusSchema = z.enum(['active', 'inactive', 'deceased', 'pending_verification']);

export const patientIdentityGenderSchema = z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']);

export const patientIdentitySchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  gender: patientIdentityGenderSchema,
  mrn: z.string().min(1, 'Medical Record Number is required.'),
  status: patientIdentityStatusSchema,
  identityHash: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const createPatientIdentityRequestSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  gender: patientIdentityGenderSchema,
  mrn: z.string().min(1, 'Medical Record Number is required.'),
  status: patientIdentityStatusSchema.optional(),
});

export const updatePatientIdentityRequestSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().min(1).optional(),
  gender: patientIdentityGenderSchema.optional(),
  status: patientIdentityStatusSchema.optional(),
});

export const patientIdentityResponseSchema = z.object({
  success: z.boolean(),
  patient: patientIdentitySchema,
});

export type CreatePatientIdentityRequestInput = z.infer<typeof createPatientIdentityRequestSchema>;
export type UpdatePatientIdentityRequestInput = z.infer<typeof updatePatientIdentityRequestSchema>;
