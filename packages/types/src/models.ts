export const SexValues = ["M", "F", "O"] as const;
export type Sex = (typeof SexValues)[number];

export const EncounterStatusValues = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;
export type EncounterStatus = (typeof EncounterStatusValues)[number];

export const ClinicalNoteTypeValues = [
  "SOAP",
  "FREE_TEXT",
  "AI_SUMMARY",
  "CORRECTION",
] as const;
export type ClinicalNoteType = (typeof ClinicalNoteTypeValues)[number];

export const DiagnosisStatusValues = ["SUSPECTED", "CONFIRMED", "RESOLVED"] as const;
export type DiagnosisStatus = (typeof DiagnosisStatusValues)[number];

export interface Patient {
  id: string;
  systemId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  contactNumber: string;
  address: string;
  isActive: boolean;
}

export interface Encounter {
  id: string;
  patientId: string;
  providerId: string;
  clinicId: string;
  status: EncounterStatus;
  openedAt: string;
  closedAt: string | null;
}

export interface Vitals {
  id: string;
  encounterId: string;
  authorId: string;
  timestamp: string;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  temperature: number;
  respirationRate: number;
  spO2: number;
  weight: number;
}

export interface ClinicalNote {
  id: string;
  encounterId: string;
  authorId: string;
  type: ClinicalNoteType;
  content: string;
  timestamp: string;
}

export interface Diagnosis {
  id: string;
  encounterId: string;
  code: string;
  description: string;
  status: DiagnosisStatus;
}
