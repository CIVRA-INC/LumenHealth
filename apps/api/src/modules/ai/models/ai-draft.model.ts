import { Schema, model, models } from "mongoose";

export interface AiDraftDocument {
  clinicId: string;
  encounterId: string;
  authorId: string;
  content: string;
  status: "DRAFT";
}

const aiDraftSchema = new Schema<AiDraftDocument>(
  {
    clinicId: { type: String, required: true, trim: true, index: true },
    encounterId: { type: String, required: true, trim: true, index: true },
    authorId: { type: String, required: true, trim: true, index: true },
    content: { type: String, required: true, trim: true, minlength: 1 },
    status: { type: String, enum: ["DRAFT"], default: "DRAFT", required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

aiDraftSchema.index({ clinicId: 1, encounterId: 1, createdAt: -1 });

export const AiDraftModel = models.AiDraft || model<AiDraftDocument>("AiDraft", aiDraftSchema);

