import { Schema, model, models } from "mongoose";

export type ClinicalNoteType = "SOAP" | "FREE_TEXT" | "AI_SUMMARY" | "CORRECTION";

export interface ClinicalNoteDocument {
  encounterId: string;
  authorId: string;
  clinicId: string;
  type: ClinicalNoteType;
  content: string;
  timestamp: Date;
  correctionOfNoteId?: string;
}

const clinicalNoteSchema = new Schema<ClinicalNoteDocument>(
  {
    encounterId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    authorId: {
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
    type: {
      type: String,
      enum: ["SOAP", "FREE_TEXT", "AI_SUMMARY", "CORRECTION"],
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    correctionOfNoteId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

clinicalNoteSchema.index({ clinicId: 1, encounterId: 1, timestamp: -1 });

export const ClinicalNoteModel =
  models.ClinicalNote || model<ClinicalNoteDocument>("ClinicalNote", clinicalNoteSchema);
