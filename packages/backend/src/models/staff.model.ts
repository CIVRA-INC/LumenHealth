import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";

interface Staff extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role:
    | "SuperAdmin"
    | "Doctor"
    | "Nurse"
    | "Pharmacist"
    | "CHW"
    | "ClinicAdmin";
  isActive: boolean;
  clinicId: Schema.Types.ObjectId | string;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
  getPublicProfile(): Omit<Staff, "password">;
}

const staffSchema = new Schema<Staff>({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please fill a valid email address"],
  },
  password: { type: String, required: [true, "Password is required"] },
  firstName: { type: String, required: [true, "First name is required"] },
  lastName: { type: String, required: [true, "Last name is required"] },
  role: {
    type: String,
    enum: ["SuperAdmin", "Doctor", "Nurse", "Pharmacist", "CHW", "ClinicAdmin"],
    required: [true, "Role is required"],
  },
  isActive: { type: Boolean, default: true },
  clinicId: { type: Schema.Types.ObjectId, ref: "Clinic" },
});

staffSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

staffSchema.methods.getPublicProfile = function () {
  const { password, ...publicProfile } = this.toObject();
  return publicProfile;
};

export const Staff = mongoose.model<Staff>("Staff", staffSchema);
