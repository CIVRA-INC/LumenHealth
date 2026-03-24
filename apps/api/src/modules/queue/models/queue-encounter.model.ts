import { Schema, model, models } from "mongoose";

export type QueueStatus = "WAITING" | "TRIAGE" | "CONSULTATION";
export type EncounterStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export interface QueueEncounterDocument {
  encounterId?: string;
  clinicId: string;
  patientName: string;
  systemId: string;
  queueStatus: QueueStatus;
  encounterStatus: EncounterStatus;
  openedAt: Date;
}

const queueEncounterSchema = new Schema<QueueEncounterDocument>(
  {
    encounterId: {
      type: String,
      trim: true,
      index: true,
    },
    clinicId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    systemId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    queueStatus: {
      type: String,
      enum: ["WAITING", "TRIAGE", "CONSULTATION"],
      required: true,
      index: true,
    },
    encounterStatus: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "CLOSED"],
      required: true,
      default: "OPEN",
      index: true,
    },
    openedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

queueEncounterSchema.index({ clinicId: 1, openedAt: -1 });
queueEncounterSchema.index({ clinicId: 1, encounterId: 1 }, { unique: true, sparse: true });

export const QueueEncounterModel =
  models.QueueEncounter || model<QueueEncounterDocument>("QueueEncounter", queueEncounterSchema);
