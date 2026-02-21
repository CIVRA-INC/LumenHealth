import { z } from "zod";

export const roleSchema = z.enum([
  "SUPER_ADMIN",
  "CLINIC_ADMIN",
  "DOCTOR",
  "NURSE",
  "ASSISTANT",
  "READ_ONLY",
]);

export const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name must be at most 120 characters"),
  email: z.string().email("Email must be a valid email address"),
  role: roleSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
