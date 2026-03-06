import { z } from "zod";
import { AuditAction } from "./models/audit-log.model";

const paginationNumber = z.coerce.number().int().positive();

export const getAuditLogsQuerySchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    userId: z.string().trim().min(1).optional(),
    action: z.enum(AuditAction).optional(),
    format: z.enum(["json", "csv"]).optional().default("json"),
    page: paginationNumber.default(1),
    limit: paginationNumber.max(100).default(20),
  })
  .superRefine((value, ctx) => {
    if (!value.startDate || !value.endDate) {
      return;
    }

    const start = new Date(value.startDate).getTime();
    const end = new Date(value.endDate).getTime();

    if (start > end) {
      ctx.addIssue({
        path: ["startDate"],
        code: "custom",
        message: "startDate must be less than or equal to endDate",
      });
    }
  });

export type GetAuditLogsQueryDto = z.infer<typeof getAuditLogsQuerySchema>;
