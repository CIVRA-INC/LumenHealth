import { Router } from 'express';
import { authenticate } from '../middleware';
import { requireRole } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createEncounterSchema, getEncountersSchema, getEncounterByIdSchema, updateEncounterSchema } from '../schemas/encounter.schema';
import { createEncounter, getEncounters, getEncounterById, updateEncounter } from '../controllers/encounter.controller';

const router = Router({ mergeParams: true });

// All encounter actions require authentication.
// Create requires Doctor or Nurse, update requires Doctor, list/get open to Doctor or Nurse.
router.post('/patients/:patientId/encounters', authenticate, requireRole('Doctor', 'Nurse'), validate(createEncounterSchema), createEncounter);
router.get('/patients/:patientId/encounters', authenticate, requireRole('Doctor', 'Nurse'), validate(getEncountersSchema), getEncounters);
router.get('/encounters/:encounterId', authenticate, requireRole('Doctor', 'Nurse'), validate(getEncounterByIdSchema), getEncounterById);
router.put('/encounters/:encounterId', authenticate, requireRole('Doctor'), validate(updateEncounterSchema), updateEncounter);

export default router;