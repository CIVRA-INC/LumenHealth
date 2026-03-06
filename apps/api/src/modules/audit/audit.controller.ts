import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { buildAuditLogFilters } from "./audit.service";
import {
  GetAuditLogsQueryDto,
  getAuditLogsQuerySchema,
} from "./audit.validation";
import { AuditLogModel } from "./models/audit-log.model";

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

    if (query.format === "csv") {
      const header = "timestamp,userId,action,resource,resourceId,ipAddress\n";
      const rows = logs
        .map((log) =>
          [
            new Date(log.timestamp).toISOString(),
            log.userId,
            log.action,
            log.resource,
            log.resourceId ?? "",
            log.ipAddress,
          ]
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="audit-logs.csv"');
      return res.status(200).send(header + rows);
    }

    return res.json({
      status: "success",
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  },
);

export const auditRoutes = router;
