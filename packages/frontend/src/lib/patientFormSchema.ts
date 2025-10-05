import { z } from "zod"

export const patientFormSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),

  dateOfBirth: z
    .date({
      message: "Date of birth is required",
    })
    .refine((date) => {
      const today = new Date()
      const age = today.getFullYear() - date.getFullYear()
      return age >= 0 && age <= 150
    }, "Please enter a valid date of birth"),

  gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
    message: "Please select a gender",
  }),

  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[\d\s()+-]+$/, "Phone number can only contain digits, spaces, and the characters ( ) + -")
    .min(10, "Phone number must be at least 10 characters"),

  address: z
    .string()
    .min(1, "Address is required")
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address must not exceed 200 characters"),

  city: z
    .string()
    .min(1, "City is required")
    .min(2, "City must be at least 2 characters")
    .max(50, "City must not exceed 50 characters"),

  state: z
    .string()
    .min(1, "State is required")
    .min(2, "State must be at least 2 characters")
    .max(50, "State must not exceed 50 characters"),

  zipCode: z
    .string()
    .min(1, "ZIP code is required")
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)"),

  emergencyContactName: z
    .string()
    .min(1, "Emergency contact name is required")
    .min(2, "Emergency contact name must be at least 2 characters")
    .max(100, "Emergency contact name must not exceed 100 characters"),

  emergencyContactPhone: z
    .string()
    .min(1, "Emergency contact phone is required")
    .regex(/^[\d\s()+-]+$/, "Phone number can only contain digits, spaces, and the characters ( ) + -")
    .min(10, "Emergency contact phone must be at least 10 characters"),

  emergencyContactRelationship: z
    .string()
    .min(1, "Relationship is required")
    .min(2, "Relationship must be at least 2 characters")
    .max(50, "Relationship must not exceed 50 characters"),
})

export type PatientFormData = z.infer<typeof patientFormSchema>
