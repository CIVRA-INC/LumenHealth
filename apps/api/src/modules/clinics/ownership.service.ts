import { EncounterModel } from "../encounters/models/encounter.model";
import { PatientModel } from "../patients/models/patient.model";

export const findClinicPatient = (clinicId: string, patientId: string) =>
  PatientModel.findOne({ _id: patientId, clinicId }).lean();

export const findClinicEncounter = (clinicId: string, encounterId: string) =>
  EncounterModel.findOne({ _id: encounterId, clinicId }).lean();
