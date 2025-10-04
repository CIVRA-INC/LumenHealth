import mongoose, { Schema, Document } from 'mongoose';

export interface IVitals {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
}

export interface ISOAP {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface IEncounter extends Document {
  patient: mongoose.Schema.Types.ObjectId;
  provider: mongoose.Schema.Types.ObjectId;
  vitals: IVitals;
  soap: ISOAP;
  date: Date;
}

const VitalsSchema: Schema = new Schema(
  {
    bloodPressure: { type: String, required: true },
    heartRate: { type: Number, required: true },
    temperature: { type: Number, required: true },
    respiratoryRate: { type: Number, required: true },
  },
  { _id: false }
);

const SOAPSchema: Schema = new Schema(
  {
    subjective: { type: String, required: true },
    objective: { type: String, required: true },
    assessment: { type: String, required: true },
    plan: { type: String, required: true },
  },
  { _id: false }
);

const EncounterSchema: Schema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    vitals: { type: VitalsSchema, required: true },
    soap: { type: SOAPSchema, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for querying by patient chronologically
EncounterSchema.index({ patient: 1, date: -1 });

const Encounter = mongoose.model<IEncounter>('Encounter', EncounterSchema);

export default Encounter;
