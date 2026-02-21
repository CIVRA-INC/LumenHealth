import { z } from "zod";

const stellarAddressRegex = /^G[A-Z2-7]{55}$/;

export const updateClinicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Clinic name must be at least 2 characters")
      .max(120, "Clinic name must be at most 120 characters")
      .optional(),
    location: z
      .string()
      .trim()
      .max(200, "Location must be at most 200 characters")
      .optional(),
    contact: z
      .string()
      .trim()
      .max(120, "Contact must be at most 120 characters")
      .optional(),
    stellarWalletAddress: z
      .string()
      .trim()
      .regex(stellarAddressRegex, "Stellar wallet address must be a valid public key")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateClinicDto = z.infer<typeof updateClinicSchema>;
