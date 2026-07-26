import { Router, type Request, type Response } from 'express';
import { resolveAuthContext } from '../../../shared/middleware/auth-context.js';
import { requireClinicScope } from '../../../shared/middleware/clinic-scope.js';
import { patientIdentityService } from '../services/patient-identity.service.js';
import { patientIdentityInputSchema } from '@qyou/shared';

export const patientIdentityRouter = Router();

patientIdentityRouter.get(
  '/:patientId/identity',
  resolveAuthContext,
  requireClinicScope('patientId'),
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const identity = await patientIdentityService.getIdentity(patientId);

      if (!identity || identity.clinicId !== req.auth?.clinicId) {
        res.status(404).json({ success: false, error: 'Patient identity not found' });
        return;
      }

      res.json({ success: true, identity });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
);

patientIdentityRouter.patch(
  '/:patientId/identity',
  resolveAuthContext,
  requireClinicScope('patientId'),
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const parsed = patientIdentityInputSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(', '),
        });
        return;
      }

      const identity = await patientIdentityService.updateIdentity(
        patientId,
        req.auth!.clinicId,
        parsed.data,
      );

      res.json({ success: true, identity });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
);
