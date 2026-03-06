import { AuditAction } from "./models/audit-log.model";
import { GetAuditLogsQueryDto } from "./audit.validation";

export const buildAuditLogFilters = (
  clinicId: string,
  query: GetAuditLogsQueryDto,
): Record<string, unknown> => {
  const filters: Record<string, unknown> = { clinicId };

  if (query.userId) {
    filters.userId = query.userId;
  }

  if (query.action) {
    filters.action = query.action as AuditAction;
  }

  if (query.startDate || query.endDate) {
    const timestampFilter: { $gte?: Date; $lte?: Date } = {};

    if (query.startDate) {
      timestampFilter.$gte = new Date(query.startDate);
    }

    if (query.endDate) {
      timestampFilter.$lte = new Date(query.endDate);
    }

    filters.timestamp = timestampFilter;
  }

  return filters;
};
