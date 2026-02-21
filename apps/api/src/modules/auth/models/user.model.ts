import bcrypt from "bcryptjs";
import { Schema, Types, model, models } from "mongoose";
import { AppRole } from "../../../types/express";

const ROLE_VALUES: AppRole[] = [
  "SUPER_ADMIN",
  "CLINIC_ADMIN",
  "DOCTOR",
  "NURSE",
  "ASSISTANT",
  "READ_ONLY",
];

export interface User {
  fullName: string;
  email: string;
  password: string;
  role: AppRole;
  clinicId: Types.ObjectId;
  isActive: boolean;
}

const userSchema = new Schema<User>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

export const UserModel =
  models.User || model<User>("User", userSchema);
