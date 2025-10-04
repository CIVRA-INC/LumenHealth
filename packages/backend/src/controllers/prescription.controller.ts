import { Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import * as prescriptionService from '../services/prescription.service';
import { AuthenticatedRequest } from '../types';

// Create a new prescription 
export const createPrescription = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { patient, medications } = req.body;
  const { encounterId } = req.params;
  const prescribedBy = req.user?.id;

  if (!prescribedBy) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const prescription = await prescriptionService.createPrescription({
    patient,
    encounter: encounterId,
    prescribedBy,
    medications,
  });

  res.status(201).json({
    success: true,
    message: 'Prescription created successfully',
    data: prescription,
  });
});

// Get all prescriptions for a patient
export const getPatientPrescriptions = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await prescriptionService.getPatientPrescriptions(patientId, page, limit);

  res.status(200).json({
    success: true,
    message: 'Patient prescriptions retrieved successfully',
    data: result,
  });
});

// Get all prescriptions with status 'Prescribed' for pharmacist
export const getPharmacyQueue = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await prescriptionService.getPharmacyQueue(page, limit);

  res.status(200).json({
    success: true,
    message: 'Pharmacy queue retrieved successfully',
    data: result,
  });
});

// Dispense a prescription for Pharmacist
export const dispensePrescription = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const pharmacistId = req.user?.id;

  if (!pharmacistId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const prescription = await prescriptionService.dispensePrescription(id, pharmacistId);

  res.status(200).json({
    success: true,
    message: 'Prescription dispensed successfully',
    data: prescription,
  });
});
