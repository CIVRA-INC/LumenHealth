import { Router } from 'express';
import * as controller from '../controllers/prescription.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { 
  createPrescriptionSchema, 
  dispensePrescriptionSchema, 
  getPatientPrescriptionsSchema, 
  getPharmacyQueueSchema 
} from '../schema/prescription.schema';

const router = Router();

// POST /api/encounters/:encounterId/prescriptions
router.post(
  '/encounters/:encounterId/prescriptions',
  authenticate,
  requireRole('Doctor'),
  validate(createPrescriptionSchema),
  controller.createPrescription
);

// GET /api/patients/:patientId/prescriptions
router.get(
  '/patients/:patientId/prescriptions',
  authenticate,
  requireRole('Doctor','Nurse','Pharmacist'),
  validate(getPatientPrescriptionsSchema),
  controller.getPatientPrescriptions
);


// GET /api/pharmacy/queue
router.get(
  '/pharmacy/queue',
  authenticate,
  requireRole('Pharmacist'),
  validate(getPharmacyQueueSchema),
  controller.getPharmacyQueue
);

// PATCH /api/prescriptions/:id/dispense
router.patch(
  '/prescriptions/:id/dispense',
  authenticate,
  requireRole('Pharmacist'),
  validate(dispensePrescriptionSchema),
  controller.dispensePrescription
);

export default router;
