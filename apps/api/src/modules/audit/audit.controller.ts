import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { paginationQuerySchema, sortDirectionSchema, toPage, type Page } from '@lumen/contracts';
import { Ctx, RequirePermissions } from '../../common/decorators';
import type { RequestContext } from '../../common/request-context';
import { parse } from '../../common/zod';
import { PrismaService } from '../../database/prisma.service';

const querySchema = paginationQuerySchema.extend({
  patientId: z.uuid().optional(),
  /** Matches the start of the action code, e.g. `patient.` or `encounter.finalize`. */
  action: z.string().max(80).optional(),
  outcome: z.enum(['SUCCESS', 'DENIED', 'FAILURE']).optional(),
  /** Time order. Newest first by default. */
  order: sortDirectionSchema.default('desc'),
});

export interface AuditEventView {
  id: string;
  occurredAt: string;
  action: string;
  outcome: string;
  resourceType: string;
  resourceId: string | null;
  patientId: string | null;
  actor: { userId: string; fullName: string } | null;
  ipAddress: string | null;
}

@ApiTags('Audit')
@Controller({ path: 'audit-events', version: '1' })
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit.read')
  async list(
    @Ctx() ctx: RequestContext,
    @Query() rawQuery: unknown,
  ): Promise<Page<AuditEventView>> {
    const q = parse(querySchema, rawQuery);
    const where = {
      organizationId: ctx.organizationId,
      ...(q.patientId ? { patientId: q.patientId } : {}),
      ...(q.action ? { action: { startsWith: q.action } } : {}),
      ...(q.outcome ? { outcome: q.outcome } : {}),
    };
    const { rows, total } = await this.prisma.tenant(ctx.organizationId, async (tx) => {
      const rows = await tx.auditEvent.findMany({
        where,
        orderBy: [{ occurredAt: q.order }, { id: q.order }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      });
      return { rows, total: await tx.auditEvent.count({ where }) };
    });
    const actorIds = [
      ...new Set(rows.map((r) => r.actorUserId).filter((id): id is string => !!id)),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, fullName: true },
    });
    const names = new Map(users.map((u) => [u.id, u.fullName]));
    return toPage(
      rows.map((r) => ({
        id: r.id,
        occurredAt: r.occurredAt.toISOString(),
        action: r.action,
        outcome: r.outcome,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        patientId: r.patientId,
        actor: r.actorUserId
          ? { userId: r.actorUserId, fullName: names.get(r.actorUserId) ?? 'Unknown' }
          : null,
        ipAddress: r.ipAddress,
      })),
      total,
      q.page,
      q.pageSize,
    );
  }
}
