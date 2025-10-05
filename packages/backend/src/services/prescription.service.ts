import mongoose from 'mongoose';
import { Prescription, IPrescription } from '../models/prescription.model';
import Patient from '../models/patient.model';
import Staff from '../models/staff.model';
import Encounter from '../models/encounter.model';

interface CreatePrescriptionData {
  patient: string;
  encounter: string;
  prescribedBy: string;
  medications: IPrescription['medications'];
}

// --- Create a new prescription ---
export const createPrescription = async (data: CreatePrescriptionData): Promise<IPrescription> => {
  // Validate referenced documents exist
  const patientExists = await Patient.exists({ _id: data.patient });
  if (!patientExists) throw new Error('Patient not found');

  const encounterExists = await Encounter.exists({ _id: data.encounter, patient: data.patient });
  if (!encounterExists) throw new Error('Encounter not found for this patient');

  const staffExists = await Staff.exists({ _id: data.prescribedBy });
  if (!staffExists) throw new Error('Prescribing staff not found');

  // Create and save prescription
  const prescription = new Prescription(data);
  await prescription.save();

  return prescription.populate([
    { path: 'patient', select: 'firstName lastName UPID' },
    { path: 'prescribedBy', select: 'firstName lastName role' },
  ]);
};

// --- Get all prescriptions for a patient ---
export const getPatientPrescriptions = async (patientId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const prescriptions = await Prescription.find({ patient: patientId })
    .populate([
      { path: 'patient', select: 'firstName lastName UPID' },
      { path: 'prescribedBy', select: 'firstName lastName role' },
      { path: 'dispensedBy', select: 'firstName lastName role' },
    ])
    .sort({ datePrescribed: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Prescription.countDocuments({ patient: patientId });

  return { prescriptions, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// --- Get pharmacy queue ---
export const getPharmacyQueue = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const prescriptions = await Prescription.find({ status: 'Prescribed' })
    .populate([
      { path: 'patient', select: 'firstName lastName UPID' },
      { path: 'prescribedBy', select: 'firstName lastName role' },
    ])
    .sort({ datePrescribed: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Prescription.countDocuments({ status: 'Prescribed' });

  return { prescriptions, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// --- Dispense a prescription ---
export const dispensePrescription = async (id: string, pharmacistId: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid prescription ID');

  const prescription = await Prescription.findById(id);
  if (!prescription) throw new Error('Prescription not found');
  if (prescription.status === 'Dispensed') throw new Error('Prescription already dispensed');

  const pharmacistExists = await Staff.exists({ _id: pharmacistId, role: 'Pharmacist' });
  if (!pharmacistExists) throw new Error('Pharmacist not found or unauthorized');

  prescription.status = 'Dispensed';
  prescription.dispensedBy = new mongoose.Types.ObjectId(pharmacistId);

  await prescription.save();

  return prescription.populate([
    { path: 'patient', select: 'firstName lastName UPID' },
    { path: 'prescribedBy', select: 'firstName lastName role' },
    { path: 'dispensedBy', select: 'firstName lastName role' },
  ]);
};
