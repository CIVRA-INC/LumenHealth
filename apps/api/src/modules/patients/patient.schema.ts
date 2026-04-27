/**
 * Persistence schema and index definitions for the Patient aggregate.
 * Extends the existing PatientModel with audit metadata and tenancy-safe indexes.
 */

import { Schema, model, models } from "mongoose";
import { PatientStatus, PatientSex } from "./patient.domain";

export interface PatientRecord {
  systemId: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: PatientSex;
  contactNumber: string;
  address: string;
  searchToken: string;   // normalised concat for fuzzy lookup
  status: PatientStatus;
  createdBy: string;
  updatedBy: string;
}

const patientRecordSchema = new Schema<PatientRecord>(
  {
    systemId:      { type: String, required: true, unique: true, index: true, trim: true },
    clinicId:      { type: String, required: true, index: true },
    firstName:     { type: String, required: true, trim: true },
    lastName:      { type: String, required: true, trim: true },
    dateOfBirth:   { type: Date,   required: true },
    sex:           { type: String, enum: ["M", "F", "O"], required: true },
    contactNumber: { type: String, required: true, trim: true },
    address:       { type: String, required: true, trim: true },
    searchToken:   { type: String, required: true, trim: true, index: true },
    status:        { type: String, enum: ["active", "inactive", "merged", "deceased"], default: "active" },
    createdBy:     { type: String, required: true },
    updatedBy:     { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

// Compound index: tenant-scoped name sort (primary list view)
patientRecordSchema.index({ clinicId: 1, lastName: 1, firstName: 1 });

// Compound index: tenant-scoped status filter (active patient lists)
patientRecordSchema.index({ clinicId: 1, status: 1 });

// Full-text index: keyword search across name fields and systemId
patientRecordSchema.index(
  { firstName: "text", lastName: "text", systemId: "text" },
  { name: "patient_text_search" },
);

export const PatientRecordModel =
  models.PatientRecord || model<PatientRecord>("PatientRecord", patientRecordSchema);
