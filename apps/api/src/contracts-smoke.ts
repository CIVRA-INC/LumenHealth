import type { ClinicalNote, Diagnosis, Encounter, Patient, Vitals } from "@lumen/types";
import {
  ClinicalNoteSchema,
  DiagnosisSchema,
  EncounterSchema,
  PatientSchema,
  VitalsSchema,
} from "@lumen/types";

export type ApiSharedContracts = {
  patient: Patient;
  encounter: Encounter;
  vitals: Vitals;
  note: ClinicalNote;
  diagnosis: Diagnosis;
};

export const apiContractSchemaMap = {
  patient: PatientSchema,
  encounter: EncounterSchema,
  vitals: VitalsSchema,
  note: ClinicalNoteSchema,
  diagnosis: DiagnosisSchema,
};
