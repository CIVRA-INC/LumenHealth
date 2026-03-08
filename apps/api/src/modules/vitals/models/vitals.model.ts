import { Schema, model, models } from "mongoose";

export type VitalsFlag =
  | "FEVER"
  | "CRITICAL_FEVER"
  | "TACHYCARDIA"
  | "BRADYCARDIA"
  | "HYPERTENSION"
  | "HYPOTENSION";

export interface VitalsDocument {
  encounterId: string;
  authorId: string;
  clinicId: string;
  timestamp: Date;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  temperature: number;
  respirationRate: number;
  spO2: number;
  weight: number;
  flags: VitalsFlag[];
}

const vitalsSchema = new Schema<VitalsDocument>(
  {
    encounterId: { type: String, required: true, trim: true, index: true },
    authorId: { type: String, required: true, trim: true },
    clinicId: { type: String, required: true, trim: true, index: true },
    timestamp: { type: Date, required: true, default: () => new Date(), index: true },
    bpSystolic: { type: Number, required: true, min: 30, max: 300 },
    bpDiastolic: { type: Number, required: true, min: 20, max: 200 },
    heartRate: { type: Number, required: true, min: 20, max: 260 },
    temperature: { type: Number, required: true, min: 30, max: 45 },
    respirationRate: { type: Number, required: true, min: 5, max: 80 },
    spO2: { type: Number, required: true, min: 40, max: 100 },
    weight: { type: Number, required: true, min: 1, max: 500 },
    flags: {
      type: [String],
      enum: [
        "FEVER",
        "CRITICAL_FEVER",
        "TACHYCARDIA",
        "BRADYCARDIA",
        "HYPERTENSION",
        "HYPOTENSION",
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

vitalsSchema.index({ clinicId: 1, encounterId: 1, timestamp: -1 });

export const VitalsModel = models.Vitals || model<VitalsDocument>("Vitals", vitalsSchema);
