import mongoose, { Schema, Document } from 'mongoose';

export interface IPrescription extends Document {
  patient: mongoose.Types.ObjectId;
  encounter: mongoose.Types.ObjectId;
  prescribedBy: mongoose.Types.ObjectId;
  medications: Array<{
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  status: 'Prescribed' | 'Dispensed';
  dispensedBy?: mongoose.Types.ObjectId;
  datePrescribed: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    encounter: { type: Schema.Types.ObjectId, ref: 'Encounter', required: true },
    prescribedBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    medications: [
      {
        drugName: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
      },
    ],
    status: { type: String, enum: ['Prescribed', 'Dispensed'], default: 'Prescribed' },
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    datePrescribed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
