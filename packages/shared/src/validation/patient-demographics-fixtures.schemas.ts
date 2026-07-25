import { z } from 'zod';

export const genderCategorySchema = z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']);

export const emergencyContactItemSchema = z.object({
  name: z.string().min(1, 'Contact name is required.'),
  relationship: z.string().min(1, 'Relationship is required.'),
  phoneNumber: z.string().min(5, 'Phone number is required.'),
});

export const patientDemographicRecordSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  dateOfBirth: z.string().min(1),
  gender: genderCategorySchema,
  bloodType: z.string().optional(),
  emergencyContact: emergencyContactItemSchema,
});

export type PatientDemographicRecordInput = z.infer<typeof patientDemographicRecordSchema>;
