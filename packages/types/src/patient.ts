import { z } from "zod";

export const patientGenderSchema = z.enum(["male", "female", "other"]);
export type PatientGender = z.infer<typeof patientGenderSchema>;

export const patientRecordStatusSchema = z.enum([
  "active",
  "archived",
  "pending_verification",
]);
export type PatientRecordStatus = z.infer<typeof patientRecordStatusSchema>;

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(1),
  relationship: z.string().trim().min(1),
  phoneNumber: z.string().trim().min(5),
});
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

export const patientIdentityModelSchema = z.object({
  id: z.string().uuid(),
  nationalId: z.string().trim().min(5),
  fullName: z.string().trim().min(2),
  dateOfBirth: z.string().date(),
  gender: patientGenderSchema,
  bloodGroup: z.string().trim().min(1).optional(),
  emergencyContact: emergencyContactSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PatientIdentityModel = z.infer<typeof patientIdentityModelSchema>;

export const patientRecordHeaderSchema = z.object({
  patientId: z.string().uuid(),
  status: patientRecordStatusSchema,
  primaryClinicId: z.string().uuid(),
});
export type PatientRecordHeader = z.infer<typeof patientRecordHeaderSchema>;

export const patientMasterRecordSchema = patientIdentityModelSchema.extend({
  header: patientRecordHeaderSchema,
});
export type PatientMasterRecord = z.infer<typeof patientMasterRecordSchema>;

export const createPatientIdentityRequestSchema = patientIdentityModelSchema
  .pick({
    nationalId: true,
    fullName: true,
    dateOfBirth: true,
    gender: true,
    bloodGroup: true,
    emergencyContact: true,
  })
  .extend({
    primaryClinicId: z.string().uuid(),
  });
export type CreatePatientIdentityRequest = z.infer<typeof createPatientIdentityRequestSchema>;

export const updatePatientIdentityRequestSchema = createPatientIdentityRequestSchema
  .omit({ primaryClinicId: true })
  .partial();
export type UpdatePatientIdentityRequest = z.infer<typeof updatePatientIdentityRequestSchema>;