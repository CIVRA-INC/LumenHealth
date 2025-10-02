import { Router } from 'express';
import { validate, authenticate } from '../middleware';
import {
  createPatientSchema,
  getPatientsSchema,
  getPatientByIdSchema,
  updatePatientSchema,
} from '../schema/patient.schema';
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
} from '../controllers/patient.controller';

const router = Router();

router.post('/', authenticate, validate(createPatientSchema), createPatient);
router.get('/', authenticate, validate(getPatientsSchema), getPatients);
router.get('/:id', authenticate, validate(getPatientByIdSchema), getPatientById);
router.put('/:id', authenticate, validate(updatePatientSchema), updatePatient);

export default router;
