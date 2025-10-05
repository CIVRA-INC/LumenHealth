import { z } from 'zod';
import { encounterTypes } from '../models/encounter.model';

export const vitalsSchema = z.object({
  bloodPressure: z.string().min(1),
  heartRate: z.number().int().nonnegative(),
  temperature: z.number(),
  respiratoryRate: z.number().int().nonnegative(),
});

export const soapSchema = z.object({
  subjective: z.string().min(1),
  objective: z.string().min(1),
  assessment: z.string().min(1),
  plan: z.string().min(1),
});

export const createEncounterSchema = z.object({
  body: z.object({
    vitals: vitalsSchema,
    soap: soapSchema,
    encounterDate: z.coerce.date().optional(),
    encounterType: z.enum(encounterTypes).optional(),
  }),
  params: z.object({
    patientId: z.string().min(1),
  }),
});

export const updateEncounterSchema = z.object({
  body: z.object({
    vitals: vitalsSchema.partial().optional(),
    soap: soapSchema.partial().optional(),
    encounterDate: z.coerce.date().optional(),
    encounterType: z.enum(encounterTypes).optional(),
  }),
  params: z.object({
    encounterId: z.string().min(1),
  }),
});

export const getEncountersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
  }),
  params: z.object({
    patientId: z.string().min(1),
  }),
});

export const getEncounterByIdSchema = z.object({
  params: z.object({
    encounterId: z.string().min(1),
  }),
});