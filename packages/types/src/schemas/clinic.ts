import { z } from "zod";

const E164_PHONE = /^\+[1-9]\d{7,14}$/;

// Messages match the API's class-validator DTOs so errors read the same.
const nameField = z
  .string({ message: "name must be at least 2 characters" })
  .trim()
  .min(2, "name must be at least 2 characters")
  .max(120, "name must be 120 characters or fewer");

const addressField = z
  .string({ message: "address is required" })
  .trim()
  .min(1, "address is required")
  .max(300, "address must be 300 characters or fewer");

const phoneField = z
  .string({ message: "phone is required" })
  .trim()
  .min(1, "phone is required")
  .regex(E164_PHONE, "phone must be a valid E.164 number");

const emailField = z
  .string({ message: "a valid email is required" })
  .trim()
  .max(254, "email must be 254 characters or fewer")
  .email("a valid email is required");

export const CreateClinicRequestSchema = z.object({
  name: nameField,
  address: addressField,
  phone: phoneField,
  email: emailField,
});

export const UpdateClinicRequestSchema = z
  .object({
    name: nameField.optional(),
    address: addressField.optional(),
    phone: phoneField.optional(),
    email: emailField.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field must be provided",
  });

export type CreateClinicRequest = z.infer<typeof CreateClinicRequestSchema>;
export type UpdateClinicRequest = z.infer<typeof UpdateClinicRequestSchema>;
