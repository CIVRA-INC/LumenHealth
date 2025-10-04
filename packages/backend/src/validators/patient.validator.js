import { z } from 'zod';

export const createPatientSchema = z.object({
  body: z.object({
    email: z.string().email('A valid email address is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
    gender: z.enum(['Male', 'Female']),
    contactPhone: z.string().min(1, 'Contact phone is required'),
    address: z.string().min(1, 'Address is required'),
    emergencyContact: z.object({
      name: z.string().min(1, 'Emergency contact name is required'),
      phone: z.string().min(1, 'Emergency contact phone is required'),
    }),
  }),
});

export const updatePatientSchema = z.object({
  body: createPatientSchema.shape.body.partial(), 
});