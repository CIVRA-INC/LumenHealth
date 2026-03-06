import { Schema, model, models } from "mongoose";

export interface PatientCounterDocument {
  _id: string;
  value: number;
}

const patientCounterSchema = new Schema<PatientCounterDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
      default: 999,
    },
  },
  {
    versionKey: false,
  },
);

export const PatientCounterModel =
  models.PatientCounter ||
  model<PatientCounterDocument>("PatientCounter", patientCounterSchema);
