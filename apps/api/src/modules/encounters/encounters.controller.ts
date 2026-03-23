import { Request, Response, Router } from 'express';
import { authorize, Roles } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { EncounterModel } from './models/encounter.model';
import {
  CreateEncounterDto,
  EncounterListQueryDto,
  EncounterIdParamsDto,
  createEncounterSchema,
  encounterListQuerySchema,
  encounterIdParamsSchema,
} from './encounters.validation';

const router = Router();

const CREATE_ROLES: Roles[] = [
  Roles.SUPER_ADMIN,
  Roles.CLINIC_ADMIN,
  Roles.DOCTOR,
  Roles.NURSE,
  Roles.ASSISTANT,
];
const CLAIM_ROLES: Roles[] = [
  Roles.SUPER_ADMIN,
  Roles.CLINIC_ADMIN,
  Roles.DOCTOR,
  Roles.NURSE,
  Roles.ASSISTANT,
];
const CLOSE_ROLES: Roles[] = [
  Roles.SUPER_ADMIN,
  Roles.CLINIC_ADMIN,
  Roles.DOCTOR,
  Roles.NURSE,
];

type CreateEncounterRequest = Request<
  Record<string, string>,
  unknown,
  CreateEncounterDto
>;
type EncounterListRequest = Request<
  Record<string, string>,
  unknown,
  unknown,
  EncounterListQueryDto
>;
type EncounterByIdRequest = Request<EncounterIdParamsDto>;

const toPayload = (doc: {
  _id: unknown;
  patientId: string;
  providerId: string;
  clinicId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  openedAt: Date;
  closedAt: Date | null;
}) => ({
  id: String(doc._id),
  patientId: doc.patientId,
  providerId: doc.providerId,
  clinicId: doc.clinicId,
  status: doc.status,
  openedAt: doc.openedAt.toISOString(),
  closedAt: doc.closedAt ? doc.closedAt.toISOString() : null,
});

router.get(
  '/',
  authorize(CREATE_ROLES),
  validateRequest({ query: encounterListQuerySchema }),
  async (req: EncounterListRequest, res: Response) => {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const filter = {
      clinicId,
      ...(req.query.patientId ? { patientId: req.query.patientId } : {}),
      ...(req.query.status ? { status: req.query.status } : {}),
    };

    const encounters = await EncounterModel.find(filter)
      .sort({ openedAt: -1 })
      .limit(req.query.limit ?? 25)
      .lean();

    return res.json({
      status: 'success',
      data: encounters.map((encounter) =>
        toPayload(encounter as Parameters<typeof toPayload>[0]),
      ),
    });
  },
);

router.post(
  '/',
  authorize(CREATE_ROLES),
  validateRequest({ body: createEncounterSchema }),
  async (req: CreateEncounterRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    const providerId = req.user?.userId;

    if (!clinicId || !providerId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const created = await EncounterModel.create({
      patientId: req.body.patientId ?? 'mock-patient-123',
      providerId,
      clinicId,
      status: 'OPEN',
      openedAt: new Date(),
      closedAt: null,
    });

    return res.status(201).json({
      status: 'success',
      data: toPayload(created.toObject() as Parameters<typeof toPayload>[0]),
    });
  },
);

router.patch(
  '/:id/claim',
  authorize(CLAIM_ROLES),
  validateRequest({ params: encounterIdParamsSchema }),
  async (req: EncounterByIdRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    const providerId = req.user?.userId;

    if (!clinicId || !providerId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const result = await EncounterModel.updateOne(
        {
          _id: req.params.id,
          clinicId,
          status: { $in: ['OPEN', 'IN_PROGRESS'] },
        },
        {
          $set: {
            providerId,
            status: 'IN_PROGRESS',
          },
        },
      );

      if (result.matchedCount === 0) {
        const existing = await EncounterModel.findOne({
          _id: req.params.id,
          clinicId,
        })
          .select({ status: 1 })
          .lean();

        if (!existing) {
          return res.status(404).json({
            error: 'NotFound',
            message: 'Encounter not found',
          });
        }

        if (existing.status === 'CLOSED') {
          return res.status(409).json({
            error: 'Conflict',
            message: 'Encounter is closed and cannot be modified',
          });
        }

        return res.status(409).json({
          error: 'Conflict',
          message: 'Encounter could not be claimed',
        });
      }

      const updated = await EncounterModel.findOne({
        _id: req.params.id,
        clinicId,
      }).lean();
      if (!updated) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Encounter not found',
        });
      }

      return res.json({
        status: 'success',
        data: toPayload(updated as Parameters<typeof toPayload>[0]),
      });
    } catch (error) {
      if ((error as Error).message.includes('closed')) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Encounter is closed and cannot be modified',
        });
      }

      throw error;
    }
  },
);

router.patch(
  '/:id/close',
  authorize(CLOSE_ROLES),
  validateRequest({ params: encounterIdParamsSchema }),
  async (req: EncounterByIdRequest, res: Response) => {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const closedAt = new Date();

    try {
      const canAdminOverride =
        req.user?.role === Roles.SUPER_ADMIN ||
        req.user?.role === Roles.CLINIC_ADMIN;
      const providerId = req.user?.userId;

      if (!providerId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const closeFilter = canAdminOverride
        ? {
            _id: req.params.id,
            clinicId,
            status: { $ne: 'CLOSED' as const },
          }
        : {
            _id: req.params.id,
            clinicId,
            providerId,
            status: { $ne: 'CLOSED' as const },
          };

      const result = await EncounterModel.updateOne(closeFilter, {
        $set: {
          status: 'CLOSED',
          closedAt,
        },
      });

      if (result.matchedCount === 0) {
        const existing = await EncounterModel.findOne({
          _id: req.params.id,
          clinicId,
        })
          .select({ status: 1, providerId: 1 })
          .lean();

        if (!existing) {
          return res.status(404).json({
            error: 'NotFound',
            message: 'Encounter not found',
          });
        }

        if (existing.status === 'CLOSED') {
          return res.status(409).json({
            error: 'Conflict',
            message: 'Encounter is already closed',
          });
        }

        if (!canAdminOverride && existing.providerId !== providerId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Only the assigned provider can close this encounter',
          });
        }

        return res.status(409).json({
          error: 'Conflict',
          message: 'Encounter could not be closed',
        });
      }

      const updated = await EncounterModel.findOne({
        _id: req.params.id,
        clinicId,
      }).lean();
      if (!updated) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Encounter not found',
        });
      }

      return res.json({
        status: 'success',
        data: toPayload(updated as Parameters<typeof toPayload>[0]),
      });
    } catch (error) {
      if ((error as Error).message.includes('closed')) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Encounter is closed and cannot be modified',
        });
      }

      throw error;
    }
  },
);

export const encounterRoutes = router;
