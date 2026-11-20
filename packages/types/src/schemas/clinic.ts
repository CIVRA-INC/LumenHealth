import { z } from "zod";

// Messages match the API's class-validator DTOs so errors read the same.
const nameField = z
  .string({ message: "name must be at least 2 characters" })
  .min(2, "name must be at least 2 characters")
  .max(120, "name must be 120 characters or fewer");

export const CreateClinicRequestSchema = z.object({
  name: nameField,
  address: z.string({ message: "address is required" }).min(1, "address is required"),
  phone: z.string({ message: "phone is required" }).min(1, "phone is required"),
  email: z.string({ message: "a valid email is required" }).email("a valid email is required"),
});

export const UpdateClinicRequestSchema = z.object({
  name: nameField.optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("a valid email is required").optional(),
});

export type CreateClinicRequest = z.infer<typeof CreateClinicRequestSchema>;
export type UpdateClinicRequest = z.infer<typeof UpdateClinicRequestSchema>;
