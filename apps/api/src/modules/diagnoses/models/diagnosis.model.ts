import { Schema, model, models } from "mongoose";

export type DiagnosisStatus = "SUSPECTED" | "CONFIRMED" | "RESOLVED";

export interface DiagnosisDocument {
  encounterId: string;
  clinicId: string;
  code: string;
  description: string;
  status: DiagnosisStatus;
}

const diagnosisSchema = new Schema<DiagnosisDocument>(
  {
    encounterId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    clinicId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SUSPECTED", "CONFIRMED", "RESOLVED"],
      required: true,
      default: "CONFIRMED",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

diagnosisSchema.index({ clinicId: 1, encounterId: 1, code: 1 }, { unique: true });

export const DiagnosisModel =
  models.Diagnosis || model<DiagnosisDocument>("Diagnosis", diagnosisSchema);
