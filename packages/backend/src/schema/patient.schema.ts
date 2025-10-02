import { z } from 'zod';
import { PAGINATION } from '../config/pagination';

export const createPatientSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .trim()
      .toLowerCase(),

    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters')
      .trim(),

    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters')
      .trim(),

    dateOfBirth: z
      .coerce
      .date({ message: 'Invalid date format' })
      .refine((date) => date < new Date(), {
        message: 'Date of birth must be in the past',
      })
      .refine(
        (date) => {
          const age = new Date().getFullYear() - date.getFullYear();
          return age <= 120;
        },
        {
          message: 'Invalid date of birth',
        }
      ),

    gender: z.enum(['Male', 'Female'], {
      message: 'Gender must be either Male or Female',
    }),

    contactPhone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be less than 15 digits')
      .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
      .trim(),

    address: z
      .string()
      .min(5, 'Address must be at least 5 characters')
      .max(200, 'Address must be less than 200 characters')
      .trim(),

    emergencyContact: z.object({
      name: z
        .string()
        .min(1, 'Emergency contact name is required')
        .max(100, 'Emergency contact name must be less than 100 characters')
        .trim(),

      phone: z
        .string()
        .min(10, 'Emergency contact phone must be at least 10 digits')
        .max(15, 'Emergency contact phone must be less than 15 digits')
        .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid emergency contact phone format')
        .trim(),
    }),
  }),
});

export const getPatientsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a positive number')
      .optional()
      .default(String(PAGINATION.DEFAULT_PAGE))
      .transform(Number)
      .refine((val) => val >= 1, 'Page must be at least 1'),

    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .optional()
      .default(String(PAGINATION.DEFAULT_LIMIT))
      .transform(Number)
      .refine((val) => val >= 1, 'Limit must be at least 1')
      .refine((val) => val <= PAGINATION.MAX_LIMIT, `Limit cannot exceed ${PAGINATION.MAX_LIMIT}`),

    search: z.string().max(100, 'Search query too long').trim().optional(),

    firstName: z
      .string()
      .max(50, 'First name search too long')
      .trim()
      .optional(),

    lastName: z.string().max(50, 'Last name search too long').trim().optional(),

    uniquePatientId: z
      .string()
      .max(50, 'Patient ID search too long')
      .trim()
      .optional(),
  }),
});

export const getPatientByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Patient ID is required'),
  }),
});

export const updatePatientSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid patient ID format'),
  }),
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .trim()
      .toLowerCase()
      .optional(),

    firstName: z
      .string()
      .min(1, 'First name cannot be empty')
      .max(50, 'First name must be less than 50 characters')
      .trim()
      .optional(),

    lastName: z
      .string()
      .min(1, 'Last name cannot be empty')
      .max(50, 'Last name must be less than 50 characters')
      .trim()
      .optional(),

    dateOfBirth: z
      .coerce
      .date({ message: 'Invalid date format' })
      .refine((date) => date < new Date(), {
        message: 'Date of birth must be in the past',
      })
      .optional(),

    gender: z
      .enum(['Male', 'Female'], {
        message: 'Gender must be either Male or Female',
      })
      .optional(),

    contactPhone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be less than 15 digits')
      .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
      .trim()
      .optional(),

    address: z
      .string()
      .min(5, 'Address must be at least 5 characters')
      .max(200, 'Address must be less than 200 characters')
      .trim()
      .optional(),

    emergencyContact: z
      .object({
        name: z
          .string()
          .min(1, 'Emergency contact name is required')
          .max(100, 'Emergency contact name must be less than 100 characters')
          .trim(),

        phone: z
          .string()
          .min(10, 'Emergency contact phone must be at least 10 digits')
          .max(15, 'Emergency contact phone must be less than 15 digits')
          .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid emergency contact phone format')
          .trim(),
      })
      .optional(),
  }),
});

export type CreatePatientRequest = z.infer<typeof createPatientSchema>;
export type GetPatientsRequest = z.infer<typeof getPatientsSchema>;
export type GetPatientByIdRequest = z.infer<typeof getPatientByIdSchema>;
export type UpdatePatientRequest = z.infer<typeof updatePatientSchema>;
