import { Schema, model, models } from "mongoose";

export interface Clinic {
  name: string;
  location: string;
  contact: string;
  stellarWalletAddress: string;
  subscriptionExpiryDate: Date;
}

const clinicSchema = new Schema<Clinic>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    contact: {
      type: String,
      default: "",
      trim: true,
    },
    stellarWalletAddress: {
      type: String,
      default: "",
      trim: true,
    },
    subscriptionExpiryDate: {
      type: Date,
      default: () => new Date(0),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const ClinicModel =
  models.Clinic || model<Clinic>("Clinic", clinicSchema);
