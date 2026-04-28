/**
 * Service layer for patient registration and search.
 * Concentrates business rules, conflict detection, and cross-module
 * orchestration. Controllers stay thin; all domain logic lives here.
 */

import { PatientRecordModel } from "./patient.schema";
import { PatientCounterModel } from "./models/patient-counter.model";
import { assertValidDateOfBirth, normaliseSearchToken } from "./patient.domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegisterPatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;   // ISO-8601 string from request body
  sex: "M" | "F" | "O";
  contactNumber: string;
  address: string;
  clinicId: string;
  actorId: string;
}

export interface PatientSearchInput {
  query: string;
  clinicId: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildSystemId = (counter: number) => `LMN-${String(counter).padStart(4, "0")}`;

const toDto = (doc: InstanceType<typeof PatientRecordModel>) => ({
  id: String(doc._id),
  systemId: doc.systemId,
  firstName: doc.firstName,
  lastName: doc.lastName,
  dateOfBirth: doc.dateOfBirth.toISOString(),
  sex: doc.sex,
  contactNumber: doc.contactNumber,
  address: doc.address,
  status: doc.status,
});

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function registerPatient(input: RegisterPatientInput) {
  const dob = new Date(input.dateOfBirth);
  assertValidDateOfBirth(dob);

  // Conflict check: same name + DOB + clinic
  const duplicate = await PatientRecordModel.findOne({
    clinicId: input.clinicId,
    firstName: new RegExp(`^${input.firstName}$`, "i"),
    lastName: new RegExp(`^${input.lastName}$`, "i"),
    dateOfBirth: dob,
  }).lean();

  if (duplicate) {
    throw Object.assign(new Error("Patient record already exists."), { code: "DUPLICATE_PATIENT" });
  }

  const counter = await PatientCounterModel.findByIdAndUpdate(
    "patient_system_id_counter",
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  const doc = await PatientRecordModel.create({
    ...input,
    dateOfBirth: dob,
    systemId: buildSystemId(counter?.value ?? 1000),
    searchToken: normaliseSearchToken(`${input.firstName}${input.lastName}`),
    status: "active",
    createdBy: input.actorId,
    updatedBy: input.actorId,
  });

  return toDto(doc);
}

export async function findPatients({ query, clinicId, limit = 10 }: PatientSearchInput) {
  const token = normaliseSearchToken(query);
  const loose = new RegExp(query.trim().replace(/\s+/g, ".*"), "i");

  const docs = await PatientRecordModel.find({
    clinicId,
    status: "active",
    $or: [
      { $text: { $search: query } },
      { firstName: { $regex: loose } },
      { lastName: { $regex: loose } },
      { searchToken: { $regex: token } },
      { systemId: { $regex: loose } },
    ],
  })
    .limit(limit)
    .lean();

  return (docs as unknown as InstanceType<typeof PatientRecordModel>[]).map(toDto);
}

export async function getPatient(id: string, clinicId: string) {
  const doc = await PatientRecordModel.findOne({ _id: id, clinicId }).lean();
  return doc ? toDto(doc as unknown as InstanceType<typeof PatientRecordModel>) : null;
}
