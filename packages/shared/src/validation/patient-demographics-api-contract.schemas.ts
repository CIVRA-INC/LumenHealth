import { z } from "zod";
import {
  genderCategorySchema,
  emergencyContactItemSchema,
  patientDemographicRecordSchema,
} from "./patient-demographics-fixtures.schemas.js";

export const createPatientRequestSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  gender: genderCategorySchema,
  bloodType: z.string().optional(),
  emergencyContact: emergencyContactItemSchema,
});

export const updatePatientDemographicsRequestSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().min(1).optional(),
  gender: genderCategorySchema.optional(),
  bloodType: z.string().optional(),
  emergencyContact: emergencyContactItemSchema.optional(),
});

export const patientDemographicsEnvelopeSchema = z.object({
  success: z.boolean(),
  data: patientDemographicRecordSchema.optional(),
  error: z.string().optional(),
});

export const patientListEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      patients: z.array(patientDemographicRecordSchema),
      totalCount: z.number(),
    })
    .optional(),
  error: z.string().optional(),
});

export type CreatePatientRequestInput = z.infer<typeof createPatientRequestSchema>;
export type UpdatePatientDemographicsRequestInput = z.infer<typeof updatePatientDemographicsRequestSchema>;
