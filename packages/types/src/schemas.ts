import { z } from "zod";
import type {
  ClinicalNote,
  Diagnosis,
  Encounter,
  Patient,
  Vitals,
} from "./models";

export const PatientSchema = z.object({
  id: z.string().min(1),
  systemId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().datetime(),
  sex: z.enum(["M", "F", "O"]),
  contactNumber: z.string().min(1),
  address: z.string().min(1),
  isActive: z.boolean(),
});

export const EncounterSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  providerId: z.string().min(1),
  clinicId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
});

export const VitalsSchema = z.object({
  id: z.string().min(1),
  encounterId: z.string().min(1),
  authorId: z.string().min(1),
  timestamp: z.string().datetime(),
  bpSystolic: z.number(),
  bpDiastolic: z.number(),
  heartRate: z.number(),
  temperature: z.number(),
  respirationRate: z.number(),
  spO2: z.number(),
  weight: z.number(),
});

export const ClinicalNoteSchema = z.object({
  id: z.string().min(1),
  encounterId: z.string().min(1),
  authorId: z.string().min(1),
  type: z.enum(["SOAP", "FREE_TEXT", "AI_SUMMARY", "CORRECTION"]),
  content: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const DiagnosisSchema = z.object({
  id: z.string().min(1),
  encounterId: z.string().min(1),
  code: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["SUSPECTED", "CONFIRMED", "RESOLVED"]),
});

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;

type Assert<T extends true> = T;

type _PatientContractMatch = Assert<Equal<z.infer<typeof PatientSchema>, Patient>>;
type _EncounterContractMatch = Assert<Equal<z.infer<typeof EncounterSchema>, Encounter>>;
type _VitalsContractMatch = Assert<Equal<z.infer<typeof VitalsSchema>, Vitals>>;
type _ClinicalNoteContractMatch = Assert<
  Equal<z.infer<typeof ClinicalNoteSchema>, ClinicalNote>
>;
type _DiagnosisContractMatch = Assert<Equal<z.infer<typeof DiagnosisSchema>, Diagnosis>>;
