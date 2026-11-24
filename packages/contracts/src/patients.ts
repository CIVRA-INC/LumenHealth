import { z } from 'zod';
import { dateOnlySchema, paginationQuerySchema, sortDirectionSchema } from './common';

export const SEXES = ['FEMALE', 'MALE', 'OTHER', 'UNKNOWN'] as const;
export const sexSchema = z.enum(SEXES);
export type Sex = z.infer<typeof sexSchema>;
export const SEX_LABELS: Record<Sex, string> = {
  FEMALE: 'Female',
  MALE: 'Male',
  OTHER: 'Other',
  UNKNOWN: 'Unknown',
};

export const IDENTIFIER_TYPES = ['NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE'] as const;
export const identifierTypeSchema = z.enum(IDENTIFIER_TYPES);
export type IdentifierType = z.infer<typeof identifierTypeSchema>;
export const IDENTIFIER_LABELS: Record<IdentifierType, string> = {
  NATIONAL_ID: 'National ID',
  PASSPORT: 'Passport',
  DRIVERS_LICENSE: "Driver's licence",
};

/**
 * Normalises a phone number for storage and matching. Numbers written in the
 * Nigerian national format (0803…) are converted to E.164 (+234803…).
 * Returns null when the input cannot be a valid number.
 */
export function normalizePhone(input: string, defaultCountryCode = '234'): string | null {
  const cleaned = input.replace(/[\s().-]/g, '');
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  if (/^00\d{8,15}$/.test(cleaned)) return `+${cleaned.slice(2)}`;
  if (/^0\d{9,14}$/.test(cleaned)) return `+${defaultCountryCode}${cleaned.slice(1)}`;
  return null;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number' });
      return z.NEVER;
    }
    return normalized;
  });

const nameSchema = z.string().trim().min(1, 'Required').max(80);

export const patientDateOfBirthSchema = dateOnlySchema.refine((value) => {
  const time = Date.parse(`${value}T00:00:00Z`);
  return time <= Date.now() && value >= '1900-01-01';
}, 'Date of birth must be in the past');

export const addressSchema = z.object({
  line1: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().length(2).toUpperCase().default('NG'),
});

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  relationship: z.string().trim().min(2).max(60),
  phone: phoneSchema,
});
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;

export const patientIdentifierSchema = z.object({
  type: identifierTypeSchema,
  value: z.string().trim().min(3).max(64),
});

export const createPatientSchema = z.object({
  givenName: nameSchema,
  middleName: z.string().trim().max(80).optional(),
  familyName: nameSchema,
  dateOfBirth: patientDateOfBirthSchema,
  sex: sexSchema,
  phone: phoneSchema,
  email: z.email().max(254).optional(),
  address: addressSchema.optional(),
  identifiers: z.array(patientIdentifierSchema).max(4).default([]),
  emergencyContacts: z.array(emergencyContactSchema).max(3).default([]),
  /**
   * Set after the registrar has reviewed the potential duplicates returned by a
   * previous attempt and confirmed this is a different person.
   */
  confirmNotDuplicate: z.boolean().default(false),
});
export type CreatePatientInput = z.input<typeof createPatientSchema>;
export type CreatePatientParsed = z.output<typeof createPatientSchema>;

export const updatePatientSchema = z
  .object({
    givenName: nameSchema,
    middleName: z.string().trim().max(80).nullable(),
    familyName: nameSchema,
    dateOfBirth: patientDateOfBirthSchema,
    sex: sexSchema,
    phone: phoneSchema,
    email: z.email().max(254).nullable(),
    address: addressSchema.nullable(),
    emergencyContacts: z.array(emergencyContactSchema).max(3),
    /** Optimistic-concurrency token returned with the patient. */
    version: z.number().int().min(1),
  })
  .partial()
  .required({ version: true });
export type UpdatePatientInput = z.input<typeof updatePatientSchema>;

/** Columns the registry can be ordered by. Anything else is rejected. */
export const PATIENT_SORTS = ['name', 'mrn', 'dateOfBirth', 'registered'] as const;
export const patientSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  /** Defaults to `name` when searching and `registered` (newest first) otherwise. */
  sort: z.enum(PATIENT_SORTS).optional(),
  order: sortDirectionSchema.optional(),
});
export type PatientSearchQuery = z.infer<typeof patientSearchQuerySchema>;

export const duplicateCheckSchema = z.object({
  givenName: nameSchema,
  familyName: nameSchema,
  dateOfBirth: patientDateOfBirthSchema,
  phone: phoneSchema.optional(),
  identifiers: z.array(patientIdentifierSchema).max(4).default([]),
});
export type DuplicateCheckInput = z.input<typeof duplicateCheckSchema>;

export interface PatientSummary {
  id: string;
  mrn: string;
  givenName: string;
  familyName: string;
  displayName: string;
  dateOfBirth: string;
  sex: Sex;
  phone: string;
  /** When the patient was registered (UTC instant). */
  registeredAt: string;
}

export interface PatientDetail extends PatientSummary {
  middleName: string | null;
  email: string | null;
  address: { line1?: string; city?: string; state?: string; country: string } | null;
  identifiers: { id: string; type: IdentifierType; value: string }[];
  emergencyContacts: { id: string; name: string; relationship: string; phone: string }[];
  version: number;
  updatedAt: string;
}

export interface DuplicateCandidate extends PatientSummary {
  /** Why this record was flagged. */
  reasons: ('SAME_NAME_AND_DOB' | 'SAME_PHONE_AND_DOB' | 'SAME_IDENTIFIER')[];
}

/** Whole years between a date of birth and a reference date. */
export function ageInYears(dateOfBirth: string, reference: Date = new Date()): number {
  const [y, m, d] = dateOfBirth.split('-').map(Number) as [number, number, number];
  let age = reference.getUTCFullYear() - y;
  const hadBirthday =
    reference.getUTCMonth() + 1 > m ||
    (reference.getUTCMonth() + 1 === m && reference.getUTCDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export function displayName(p: {
  givenName: string;
  middleName?: string | null;
  familyName: string;
}) {
  return [p.givenName, p.middleName, p.familyName].filter(Boolean).join(' ');
}
