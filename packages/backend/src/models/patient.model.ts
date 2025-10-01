import mongoose, { Schema, Document } from 'mongoose';

export const genderOptions = ['Male', 'Female'] as const;

export type Gender = (typeof genderOptions)[number];

export interface IPatient extends Document {
  UPID: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  contactPhone: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
  registeredBy: mongoose.Schema.Types.ObjectId;
}

const PatientSchema: Schema = new Schema(
  {
    UPID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: genderOptions,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    emergencyContact: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

PatientSchema.index({ createdAt: -1 });
PatientSchema.index({ firstName: 1, lastName: 1 });
PatientSchema.index({ UPID: 1 });
PatientSchema.index({ email: 1 });

PatientSchema.index({
  firstName: 'text',
  lastName: 'text',
  UPID: 'text',
});

const Patient = mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient;
