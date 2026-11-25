import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  canTransitionAppointment,
  localDate,
  localDayBounds,
  type AppointmentStatus,
  type AppointmentView,
  type CancelAppointmentInput,
  type CreateAppointmentInput,
  type CreateWalkInInput,
  type ListAppointmentsQuery,
  type Page,
  toPage,
  type QueueView,
} from '@lumen/contracts';
import {
  ConflictError,
  InvalidTransitionError,
  NotFoundError,
  ValidationError,
} from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService, type Tx } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { appointmentInclude, toAppointmentViews } from './appointment.mapper';

const DEFAULT_WALK_IN_MINUTES = 20;
/** Allowance for clock drift and for booking "right now". */
const PAST_TOLERANCE_MS = 15 * 60_000;

function constraintName(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Queries ────────────────────────────────────────────────────────────────

  async list(ctx: RequestContext, query: ListAppointmentsQuery): Promise<Page<AppointmentView>> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      let where: Prisma.AppointmentWhereInput;
      let orderBy: Prisma.AppointmentOrderByWithRelationInput;
      if (query.patientId) {
        where = {
          organizationId: ctx.organizationId,
          patientId: query.patientId,
          branchId: { in: [...ctx.accessibleBranchIds] },
          ...(query.status ? { status: query.status } : {}),
        };
        orderBy = { scheduledStart: 'desc' };
      } else {
        const date = query.date ?? localDate(ctx.timezone);
        const { start, end } = localDayBounds(ctx.timezone, date);
        where = {
          organizationId: ctx.organizationId,
          branchId: ctx.branchId,
          scheduledStart: { gte: start, lt: end },
          ...(query.status ? { status: query.status } : {}),
        };
        orderBy = { scheduledStart: 'asc' };
      }
      const rows = await tx.appointment.findMany({
        where,
        orderBy,
        include: appointmentInclude,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await tx.appointment.count({ where });
      return toPage(await toAppointmentViews(tx, rows), total, query.page, query.pageSize);
    });
  }

  async queue(ctx: RequestContext): Promise<QueueView> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const rows = await tx.appointment.findMany({
        where: {
          organizationId: ctx.organizationId,
          branchId: ctx.branchId,
          status: { in: ['CHECKED_IN', 'IN_CONSULTATION'] },
        },
        include: appointmentInclude,
      });
      const views = await toAppointmentViews(tx, rows);
      const byCheckIn = (a: AppointmentView, b: AppointmentView) =>
        (a.checkedInAt ?? '').localeCompare(b.checkedInAt ?? '');
      return {
        // Urgent patients first, then first-come first-served.
        waiting: views
          .filter((v) => v.status === 'CHECKED_IN')
          .sort((a, b) =>
            a.priority === b.priority ? byCheckIn(a, b) : a.priority === 'URGENT' ? -1 : 1,
          ),
        inConsultation: views.filter((v) => v.status === 'IN_CONSULTATION').sort(byCheckIn),
      };
    });
  }

  async get(ctx: RequestContext, id: string): Promise<AppointmentView> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const row = await tx.appointment.findFirst({
        where: {
          id,
          organizationId: ctx.organizationId,
          branchId: { in: [...ctx.accessibleBranchIds] },
        },
        include: appointmentInclude,
      });
      if (!row) throw new NotFoundError('Appointment');
      return (await toAppointmentViews(tx, [row]))[0]!;
    });
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  private async assertPatient(tx: Tx, ctx: RequestContext, patientId: string) {
    const patient = await tx.patient.findFirst({
      where: { id: patientId, organizationId: ctx.organizationId },
    });
    if (!patient) throw new NotFoundError('Patient');
  }

  private async assertDepartment(tx: Tx, ctx: RequestContext, departmentId?: string) {
    if (!departmentId) return;
    const dept = await tx.department.findFirst({
      where: { id: departmentId, organizationId: ctx.organizationId, branchId: ctx.branchId },
    });
    if (!dept) throw new ValidationError('That department does not belong to this branch');
  }

  private async assertClinician(ctx: RequestContext, clinicianId?: string) {
    if (!clinicianId) return;
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: clinicianId,
        organizationId: ctx.organizationId,
        role: 'CLINICIAN',
        status: 'ACTIVE',
        branches: { some: { branchId: ctx.branchId } },
      },
    });
    if (!membership) throw new ValidationError('That clinician is not available at this branch');
  }

  /** Next queue number for this branch and local day. Resets each day. */
  private async nextTicket(tx: Tx, ctx: RequestContext): Promise<number> {
    const scope = `queue:${ctx.branchId}:${localDate(ctx.timezone)}`;
    const counter = await tx.counter.upsert({
      where: { organizationId_scope: { organizationId: ctx.organizationId, scope } },
      create: { organizationId: ctx.organizationId, scope, value: 1 },
      update: { value: { increment: 1 } },
    });
    return counter.value;
  }

  private mapWriteError(error: unknown): never {
    const message = constraintName(error);
    if (message.includes('appointments_no_clinician_overlap')) {
      throw new ConflictError('That clinician already has an appointment at this time');
    }
    if (message.includes('appointments_no_patient_overlap')) {
      throw new ConflictError('This patient already has an appointment at this time');
    }
    if (message.includes('appointments_one_live_visit_per_patient')) {
      throw new ConflictError('This patient already has a visit in progress');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('This patient already has a visit in progress');
    }
    throw error;
  }

  async create(ctx: RequestContext, input: CreateAppointmentInput): Promise<AppointmentView> {
    const start = new Date(input.scheduledStart);
    if (start.getTime() < Date.now() - PAST_TOLERANCE_MS) {
      throw new ValidationError('Appointments cannot be booked in the past', {
        fields: [{ path: 'scheduledStart', message: 'Choose a time that has not passed' }],
      });
    }
    await this.assertClinician(ctx, input.clinicianId);
    const end = new Date(start.getTime() + (input.durationMinutes ?? 20) * 60_000);

    try {
      return await this.prisma.tenant(ctx.organizationId, async (tx) => {
        await this.assertPatient(tx, ctx, input.patientId);
        await this.assertDepartment(tx, ctx, input.departmentId);
        const row = await tx.appointment.create({
          data: {
            organizationId: ctx.organizationId,
            branchId: ctx.branchId,
            patientId: input.patientId,
            departmentId: input.departmentId ?? null,
            clinicianId: input.clinicianId ?? null,
            type: 'SCHEDULED',
            priority: input.priority ?? 'ROUTINE',
            scheduledStart: start,
            scheduledEnd: end,
            reason: input.reason ?? null,
            createdById: ctx.userId,
          },
          include: appointmentInclude,
        });
        await this.audit.record(tx, ctx, {
          action: 'appointment.create',
          resourceType: 'appointment',
          resourceId: row.id,
          patientId: row.patientId,
        });
        return (await toAppointmentViews(tx, [row]))[0]!;
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  async walkIn(ctx: RequestContext, input: CreateWalkInInput): Promise<AppointmentView> {
    const now = new Date();
    try {
      return await this.prisma.tenant(ctx.organizationId, async (tx) => {
        await this.assertPatient(tx, ctx, input.patientId);
        await this.assertDepartment(tx, ctx, input.departmentId);

        // A patient who already has a booking today should be checked in against it instead.
        const { start, end } = localDayBounds(ctx.timezone, localDate(ctx.timezone, now));
        const booked = await tx.appointment.findFirst({
          where: {
            organizationId: ctx.organizationId,
            patientId: input.patientId,
            status: 'SCHEDULED',
            scheduledStart: { gte: start, lt: end },
          },
        });
        if (booked) {
          throw new ConflictError(
            'This patient has a scheduled appointment today. Check them in against it instead.',
            ERROR_CODES.conflict,
            { appointmentId: booked.id },
          );
        }

        const ticketNumber = await this.nextTicket(tx, ctx);
        const row = await tx.appointment.create({
          data: {
            organizationId: ctx.organizationId,
            branchId: ctx.branchId,
            patientId: input.patientId,
            departmentId: input.departmentId ?? null,
            type: 'WALK_IN',
            status: 'CHECKED_IN',
            priority: input.priority ?? 'ROUTINE',
            scheduledStart: now,
            scheduledEnd: new Date(now.getTime() + DEFAULT_WALK_IN_MINUTES * 60_000),
            reason: input.reason,
            ticketNumber,
            checkedInAt: now,
            createdById: ctx.userId,
          },
          include: appointmentInclude,
        });
        await this.audit.record(tx, ctx, {
          action: 'appointment.walk_in',
          resourceType: 'appointment',
          resourceId: row.id,
          patientId: row.patientId,
          metadata: { ticketNumber },
        });
        return (await toAppointmentViews(tx, [row]))[0]!;
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  /**
   * Applies a status change with a compare-and-set on the current status, so two staff members
   * acting at the same moment cannot both succeed.
   */
  private async transition(
    ctx: RequestContext,
    id: string,
    to: AppointmentStatus,
    build: (
      tx: Tx,
      current: { status: AppointmentStatus; scheduledStart: Date; patientId: string },
    ) => Promise<{
      data: Prisma.AppointmentUncheckedUpdateManyInput;
      audit: string;
      metadata?: Record<string, string | number | boolean | null>;
    }>,
  ): Promise<AppointmentView> {
    try {
      return await this.prisma.tenant(ctx.organizationId, async (tx) => {
        const current = await tx.appointment.findFirst({
          where: { id, organizationId: ctx.organizationId, branchId: ctx.branchId },
        });
        if (!current) throw new NotFoundError('Appointment');
        if (!canTransitionAppointment(current.status, to)) {
          throw new InvalidTransitionError('Appointment', current.status, to);
        }
        const { data, audit, metadata } = await build(tx, current);
        const result = await tx.appointment.updateMany({
          where: { id, organizationId: ctx.organizationId, status: current.status },
          data: { ...data, status: to, version: { increment: 1 } },
        });
        if (result.count === 0) {
          const latest = await tx.appointment.findFirst({
            where: { id, organizationId: ctx.organizationId },
          });
          throw new InvalidTransitionError('Appointment', latest?.status ?? current.status, to);
        }
        await this.audit.record(tx, ctx, {
          action: audit,
          resourceType: 'appointment',
          resourceId: id,
          patientId: current.patientId,
          metadata: { from: current.status, to, ...metadata },
        });
        const row = await tx.appointment.findFirstOrThrow({
          where: { id, organizationId: ctx.organizationId },
          include: appointmentInclude,
        });
        return (await toAppointmentViews(tx, [row]))[0]!;
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  checkIn(ctx: RequestContext, id: string): Promise<AppointmentView> {
    return this.transition(ctx, id, 'CHECKED_IN', async (tx, current) => {
      if (localDate(ctx.timezone, current.scheduledStart) !== localDate(ctx.timezone)) {
        throw new ConflictError('Patients can only be checked in on the day of their appointment');
      }
      const ticketNumber = await this.nextTicket(tx, ctx);
      return {
        data: { checkedInAt: new Date(), ticketNumber },
        audit: 'appointment.check_in',
        metadata: { ticketNumber },
      };
    });
  }

  cancel(ctx: RequestContext, id: string, input: CancelAppointmentInput): Promise<AppointmentView> {
    return this.transition(ctx, id, 'CANCELLED', async () => ({
      data: { outcome: input.outcome, outcomeNote: input.note ?? null, cancelledAt: new Date() },
      audit: 'appointment.cancel',
      metadata: { outcome: input.outcome },
    }));
  }

  markNoShow(ctx: RequestContext, id: string): Promise<AppointmentView> {
    return this.transition(ctx, id, 'NO_SHOW', async (_tx, current) => {
      if (current.scheduledStart.getTime() > Date.now()) {
        throw new ConflictError(
          'An appointment cannot be marked as a no-show before its scheduled time',
        );
      }
      return {
        data: { outcome: 'NO_SHOW', cancelledAt: new Date() },
        audit: 'appointment.no_show',
      };
    });
  }
}
