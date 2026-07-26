import { z } from 'zod';
import { genderCategorySchema } from './patient-demographics-fixtures.schemas';

export const patientIdentityInputSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  gender: genderCategorySchema,
  mrn: z.string().min(1, 'MRN is required.'),
  phone: z.string().min(5, 'Phone number is required.'),
  email: z.string().email('Valid email is required.'),
  address: z.string().min(1, 'Address is required.'),
});

export const patientIdentitySchema = z.object({
  patientId: z.string().min(1),
  clinicId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  gender: genderCategorySchema,
  mrn: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  identityHash: z.string().optional(),
  anchoredAt: z.string().optional(),
  stellarTxHash: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const patientIdentityApiResponseSchema = z.object({
  success: z.boolean(),
  identity: patientIdentitySchema.optional(),
  error: z.string().optional(),
});

export const patientIdentityAnchoredResponseSchema = z.object({
  success: z.boolean(),
  identityHash: z.string().optional(),
  stellarTxHash: z.string().optional(),
  anchoredAt: z.string().optional(),
  error: z.string().optional(),
});

export const patientIdentityAnchorStatusSchema = z.object({
  patientId: z.string().min(1),
  isAnchored: z.boolean(),
  identityHash: z.string().optional(),
  stellarTxHash: z.string().optional(),
  anchoredAt: z.string().optional(),
});

export type PatientIdentityInputType = z.infer<typeof patientIdentityInputSchema>;
export type PatientIdentityInput = z.infer<typeof patientIdentityInputSchema>;
export type PatientIdentityType = z.infer<typeof patientIdentitySchema>;
