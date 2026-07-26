import { z } from 'zod';

export const genderCategorySchema = z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']);

export const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required.'),
  relationship: z.string().min(1, 'Relationship is required.'),
  phoneNumber: z.string().min(5, 'Phone number must be at least 5 characters.'),
});

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required.'),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  zipCode: z.string().min(1, 'Zip code is required.'),
  country: z.string().min(1, 'Country is required.'),
});

export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  gender: genderCategorySchema,
  bloodType: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format.').optional(),
  address: addressSchema.optional(),
  emergencyContact: emergencyContactSchema,
});

export const updatePatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').optional(),
  lastName: z.string().min(1, 'Last name is required.').optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required.').optional(),
  gender: genderCategorySchema.optional(),
  bloodType: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format.').optional(),
  address: addressSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
});

export const patientListQuerySchema = z.object({
  search: z.string().optional(),
  gender: genderCategorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientListQueryInput = z.infer<typeof patientListQuerySchema>;
