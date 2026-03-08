import { Schema, model, models } from "mongoose";

export interface Icd10CodeDocument {
  code: string;
  description: string;
  searchText: string;
}

const icd10CodeSchema = new Schema<Icd10CodeDocument>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    searchText: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

icd10CodeSchema.index({ code: "text", description: "text", searchText: "text" });

export const Icd10CodeModel =
  models.Icd10Code || model<Icd10CodeDocument>("Icd10Code", icd10CodeSchema);
