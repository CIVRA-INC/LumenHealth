import { Schema, model, models } from "mongoose";

export type EncounterStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export interface EncounterDocument {
  patientId: string;
  providerId: string;
  clinicId: string;
  status: EncounterStatus;
  openedAt: Date;
  closedAt: Date | null;
}

const encounterSchema = new Schema<EncounterDocument>(
  {
    patientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    providerId: {
      type: String,
      required: true,
      trim: true,
    },
    clinicId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
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
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

encounterSchema.pre("save", async function lockClosedEncounterOnSave() {
  if (!this._id || !this.isModified()) {
    return;
  }

  const existing = await EncounterModel.findById(this._id)
    .select({ status: 1 })
    .lean();

  if (!existing) {
    return;
  }

  if (existing.status === "CLOSED") {
    throw new Error("Encounter is closed and cannot be modified");
  }
});

encounterSchema.pre("updateOne", async function lockClosedEncounterOnUpdateOne() {
  const filter = this.getFilter() as Record<string, unknown>;
  const existing = await EncounterModel.findOne(filter)
    .select({ status: 1 })
    .lean();

  if (!existing) {
    return;
  }

  if (existing.status === "CLOSED") {
    throw new Error("Encounter is closed and cannot be modified");
  }
});

encounterSchema.index({ clinicId: 1, openedAt: -1 });

export const EncounterModel =
  models.Encounter || model<EncounterDocument>("Encounter", encounterSchema);
