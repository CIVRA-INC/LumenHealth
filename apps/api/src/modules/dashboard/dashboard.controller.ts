import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { localDate, localDayBounds, type DashboardView } from '@lumen/contracts';
import { Ctx, RequirePermissions } from '../../common/decorators';
import type { RequestContext } from '../../common/request-context';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { appointmentInclude, toAppointmentViews } from '../scheduling/appointment.mapper';

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

@ApiTags('Dashboard')
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Every figure is a query over real records in the user's current organisation and branch. */
  @Get()
  @RequirePermissions('dashboard.read')
  async get(@Ctx() ctx: RequestContext): Promise<DashboardView> {
    const now = new Date();
    const date = localDate(ctx.timezone, now);
    const { start, end } = localDayBounds(ctx.timezone, date);
    const scope = { organizationId: ctx.organizationId, branchId: ctx.branchId };

    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      // One connection per transaction: queries run in sequence.
      const branch = await tx.branch.findFirstOrThrow({
        where: { id: ctx.branchId, organizationId: ctx.organizationId },
      });
      const appointmentsToday = await tx.appointment.count({
        where: {
          ...scope,
          type: 'SCHEDULED',
          scheduledStart: { gte: start, lt: end },
          status: { not: 'CANCELLED' },
        },
      });
      const waiting = await tx.appointment.count({ where: { ...scope, status: 'CHECKED_IN' } });
      const inConsultation = await tx.encounter.count({
        where: { ...scope, status: 'IN_PROGRESS' },
      });
      const completedToday = await tx.encounter.count({
        where: {
          ...scope,
          status: { in: ['FINALIZED', 'CLOSED'] },
          finalizedAt: { gte: start, lt: end },
        },
      });
      const queueRows = await tx.appointment.findMany({
        where: { ...scope, status: 'CHECKED_IN' },
        include: appointmentInclude,
        orderBy: [{ priority: 'desc' }, { checkedInAt: 'asc' }],
        take: 8,
      });
      const upcomingRows = await tx.appointment.findMany({
        where: { ...scope, status: 'SCHEDULED', scheduledStart: { gte: start, lt: end } },
        include: appointmentInclude,
        orderBy: { scheduledStart: 'asc' },
        take: 8,
      });
      const seenToday = await tx.appointment.findMany({
        where: {
          ...scope,
          consultationStartedAt: { gte: start, lt: end },
          checkedInAt: { not: null },
        },
        select: { checkedInAt: true, consultationStartedAt: true },
      });

      const waits = seenToday.map((a) =>
        Math.max(
          0,
          Math.round((a.consultationStartedAt!.getTime() - a.checkedInAt!.getTime()) / 60_000),
        ),
      );
      return {
        date,
        timezone: ctx.timezone,
        branch: { id: branch.id, name: branch.name },
        counts: { appointmentsToday, waiting, inConsultation, completedToday },
        queue: await toAppointmentViews(tx, queueRows),
        upcoming: await toAppointmentViews(tx, upcomingRows),
        medianWaitMinutes: median(waits),
      };
    });
  }
}
