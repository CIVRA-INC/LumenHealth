import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

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

  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): Record<string, any>;
}

const StaffSchema: Schema<IStaff> = new Schema(
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
      select: false, // don't return password by default
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

// --- Hash password before saving ---
StaffSchema.pre<IStaff>('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password!, salt);
  next();
});

// --- Compare passwords method ---
StaffSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password!);
};

// --- Return safe public profile ---
StaffSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    role: this.role,
    clinicId: this.clinicId,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Staff = mongoose.model<IStaff>('Staff', StaffSchema);

export default Staff;
