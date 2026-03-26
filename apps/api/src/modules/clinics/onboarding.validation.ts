import { z } from "zod";

export const clinicRegistrationSchema = z.object({
  clinicName: z
    .string()
    .trim()
    .min(2, "Clinic name must be at least 2 characters")
    .max(120, "Clinic name must be at most 120 characters"),
  location: z.string().trim().min(2, "Location must be at least 2 characters"),
  contactNumber: z.string().trim().min(7, "Contact number must be at least 7 characters"),
  adminName: z
    .string()
    .trim()
    .min(2, "Admin name must be at least 2 characters")
    .max(120, "Admin name must be at most 120 characters"),
  adminEmail: z.string().email("Admin email must be a valid email address"),
  adminPassword: z
    .string()
    .min(8, "Admin password must be at least 8 characters")
    .max(128, "Admin password must be at most 128 characters"),
});

export type ClinicRegistrationDto = z.infer<typeof clinicRegistrationSchema>;
