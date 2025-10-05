import { Response } from 'express';
import Encounter from '../models/encounter.model';
import Patient from '../models/patient.model';
import { catchAsync } from '../utils/catch-async';
import { AuthenticatedRequest } from '../types';
import { PAGINATION } from '../config/pagination';

export const createEncounter = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params as { patientId: string };
  const { vitals, soap, encounterDate, encounterType } = req.body;

  if (!req.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  const encounter = await Encounter.create({
    patient: patient._id,
    provider: req.user.id,
    vitals,
    soap,
    encounterDate,
    encounterType,
  });

  res.status(201).json(encounter);
});

export const getEncounters = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params as { patientId: string };
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const patientExists = await Patient.exists({ _id: patientId });
  if (!patientExists) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  const [encounters, totalEncounters] = await Promise.all([
    Encounter.find({ patient: patientId })
      .sort({ encounterDate: -1 })
      .skip(skip)
      .limit(limit),
    Encounter.countDocuments({ patient: patientId }),
  ]);

  const totalPages = Math.ceil(totalEncounters / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  res.json({
    encounters,
    pagination: {
      totalEncounters,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPreviousPage,
      limit,
    },
  });
});

export const getEncounterById = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { encounterId } = req.params as { encounterId: string };
  const encounter = await Encounter.findById(encounterId);
  if (!encounter) {
    return res.status(404).json({ message: 'Encounter not found' });
  }
  res.json(encounter);
});

export const updateEncounter = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { encounterId } = req.params as { encounterId: string };
  const { vitals, soap, encounterDate, encounterType } = req.body;

  const encounter = await Encounter.findById(encounterId);
  if (!encounter) {
    return res.status(404).json({ message: 'Encounter not found' });
  }

  if (vitals) encounter.vitals = { ...encounter.vitals, ...vitals };
  if (soap) encounter.soap = { ...encounter.soap, ...soap };
  if (encounterDate) encounter.encounterDate = encounterDate;
  if (encounterType) encounter.encounterType = encounterType;

  await encounter.save();
  res.json(encounter);
});