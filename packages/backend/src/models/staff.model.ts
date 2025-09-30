import mongoose, { Schema, Document } from 'mongoose';

export const staffRoles = [
  'SuperAdmin',
  'Doctor',
  'Nurse',
  'Pharmacist',
  'CHW',
  'ClinicAdmin',
] as const;

export type StaffRole = (typeof staffRoles)[number];

export interface IStaff extends Document {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  isActive: boolean;
  clinicId: mongoose.Schema.Types.ObjectId;
}

const StaffSchema: Schema = new Schema(
  {
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
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: staffRoles,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
    },
  },
  {
    timestamps: true,
  }
);

const Staff = mongoose.model<IStaff>('Staff', StaffSchema);

export default Staff;
