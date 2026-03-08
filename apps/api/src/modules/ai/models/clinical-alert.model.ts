import { Schema, model, models } from "mongoose";

export interface ClinicalAlertDocument {
  clinicId: string;
  encounterId: string;
  message: string;
  source: "GEMINI" | "RULE_ENGINE";
  isDismissed: boolean;
  dismissedAt: Date | null;
  metadata?: Record<string, unknown>;
}

const clinicalAlertSchema = new Schema<ClinicalAlertDocument>(
  {
    clinicId: { type: String, required: true, trim: true, index: true },
    encounterId: { type: String, required: true, trim: true, index: true },
    message: { type: String, required: true, trim: true, minlength: 3, maxlength: 1000 },
    source: {
      type: String,
      enum: ["GEMINI", "RULE_ENGINE"],
      required: true,
      default: "GEMINI",
      index: true,
    },
    isDismissed: { type: Boolean, required: true, default: false, index: true },
    dismissedAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

clinicalAlertSchema.index({ clinicId: 1, encounterId: 1, isDismissed: 1, createdAt: -1 });

export const ClinicalAlertModel =
  models.ClinicalAlert || model<ClinicalAlertDocument>("ClinicalAlert", clinicalAlertSchema);

