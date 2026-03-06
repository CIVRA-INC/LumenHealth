import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { AuditLogModel } from "./models/audit-log.model";
import { buildAuditLogFilters } from "./audit.service";
import {
  GetAuditLogsQueryDto,
  getAuditLogsQuerySchema,
} from "./audit.validation";

const router = Router();

type GetAuditLogsRequest = Request<Record<string, string>, unknown, unknown, Record<string, unknown>>;

router.get(
  "/",
  authorize([Roles.CLINIC_ADMIN, Roles.SUPER_ADMIN]),
  validateRequest({ query: getAuditLogsQuerySchema }),
  async (req: GetAuditLogsRequest, res: Response) => {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const query = req.query as GetAuditLogsQueryDto;
    const page = Number(query.page);
    const limit = Number(query.limit);
    const skip = (page - 1) * limit;
    const filters = buildAuditLogFilters(clinicId, query);

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filters).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLogModel.countDocuments(filters),
    ]);

    return res.json({
      status: "success",
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
);

export const auditRoutes = router;
