import { z } from 'zod';

// Medication sub-schema
const medicationSchema = z.object({
  drugName: z.string().min(1, 'Drug name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
});

// Schema for creating a prescription
export const createPrescriptionSchema = z.object({
  body: z.object({
    patient: z.string().min(1, 'Patient ID is required'),
    medications: z
      .array(medicationSchema)
      .min(1, 'At least one medication is required'),
  }),
  params: z.object({
    encounterId: z.string().min(1, 'Encounter ID is required'),
  }),
});

// Schema for dispensing a prescription
export const dispensePrescriptionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Prescription ID is required'),
  }),
});

// Schema for fetching patient prescriptions
export const getPatientPrescriptionsSchema = z.object({
  params: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
  }),
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
  }).optional(),
});

// Schema for pharmacy queue
export const getPharmacyQueueSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
  }).optional(),
});

export type CreatePrescriptionRequest = z.infer<typeof createPrescriptionSchema>;
export type DispensePrescriptionRequest = z.infer<typeof dispensePrescriptionSchema>;
export type GetPatientPrescriptionsRequest = z.infer<typeof getPatientPrescriptionsSchema>;
export type GetPharmacyQueueRequest = z.infer<typeof getPharmacyQueueSchema>;
