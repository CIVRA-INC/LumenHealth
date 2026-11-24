import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  type AddAddendumInput,
  type AddDiagnosisInput,
  type AddMedicationOrderInput,
  type CloseEncounterInput,
  type EncounterDetail,
  type EncounterListQuery,
  toPage,
  type EncounterStatus,
  type EncounterView,
  type Page,
  type RecordVitalsInput,
  type SaveClinicalNoteInput,
  type StartEncounterInput,
  type VoidEncounterInput,
  type VoidEntryInput,
  addDiagnosisSchema,
  addMedicationOrderSchema,
  canTransitionEncounter,
} from '@lumen/contracts';
import { z } from 'zod';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  InvalidTransitionError,
  NotFoundError,
} from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService, type Tx } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  encounterInclude,
  toEncounterDetail,
  toEncounterView,
  userNames,
  type EncounterWithDetail,
} from './encounter.mapper';

const locked = (status: EncounterStatus) =>
  new DomainError(
    409,
    ERROR_CODES.locked,
    status === 'IN_PROGRESS'
      ? 'This encounter cannot be changed right now'
      : 'This encounter has been signed. Add an addendum to record a correction.',
    { status },
  );

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Loading helpers ────────────────────────────────────────────────────────

  private async load(tx: Tx, ctx: RequestContext, id: string) {
    const enc = await tx.encounter.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        branchId: { in: [...ctx.accessibleBranchIds] },
      },
    });
    if (!enc) throw new NotFoundError('Encounter');
    return enc;
  }

  private assertDraft(enc: { status: EncounterStatus }) {
    if (enc.status !== 'IN_PROGRESS') throw locked(enc.status);
  }

  private assertAttending(ctx: RequestContext, enc: { attendingId: string }) {
    if (enc.attendingId !== ctx.userId) {
      throw new ForbiddenError('Only the attending clinician can change this encounter');
    }
  }

  private async detail(tx: Tx, ctx: RequestContext, id: string): Promise<EncounterDetail> {
    const enc = (await tx.encounter.findFirstOrThrow({
      where: { id, organizationId: ctx.organizationId },
      include: encounterInclude,
    })) as EncounterWithDetail;
    return toEncounterDetail(tx, ctx, enc);
  }

  /** Runs a documentation change inside a tenant transaction and returns the refreshed encounter. */
  private async mutate(
    ctx: RequestContext,
    encounterId: string,
    options: {
      attendingOnly: boolean;
      audit: string;
      metadata?: Record<string, string | number | boolean | null>;
    },
    change: (
      tx: Tx,
      enc: { id: string; patientId: string; status: EncounterStatus; attendingId: string },
    ) => Promise<void>,
  ): Promise<EncounterDetail> {
    try {
      return await this.prisma.tenant(ctx.organizationId, async (tx) => {
        const enc = await this.load(tx, ctx, encounterId);
        this.assertDraft(enc);
        if (options.attendingOnly) this.assertAttending(ctx, enc);
        await change(tx, enc);
        await this.audit.record(tx, ctx, {
          action: options.audit,
          resourceType: 'encounter',
          resourceId: enc.id,
          patientId: enc.patientId,
          metadata: options.metadata,
        });
        return this.detail(tx, ctx, enc.id);
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): unknown {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('documentation is locked')) return locked('FINALIZED');
    if (message.includes('diagnoses_one_primary_per_encounter')) {
      return new ConflictError('This encounter already has a primary diagnosis');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictError('That entry conflicts with an existing record');
    }
    return error;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async get(ctx: RequestContext, id: string): Promise<EncounterDetail> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const enc = await this.load(tx, ctx, id);
      await this.audit.record(tx, ctx, {
        action: 'encounter.read',
        resourceType: 'encounter',
        resourceId: id,
        patientId: enc.patientId,
      });
      return this.detail(tx, ctx, id);
    });
  }

  async list(ctx: RequestContext, query: EncounterListQuery): Promise<Page<EncounterView>> {
    const where: Prisma.EncounterWhereInput = {
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.mine ? { attendingId: ctx.userId } : {}),
    };
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const rows = await tx.encounter.findMany({
        where,
        include: { patient: true },
        orderBy: [{ startedAt: query.order }, { id: query.order }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await tx.encounter.count({ where });
      const names = await userNames(
        tx,
        rows.flatMap((r) => [r.attendingId, r.finalizedById]),
      );
      return toPage(
        rows.map((r) => toEncounterView(r, names, ctx)),
        total,
        query.page,
        query.pageSize,
      );
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async start(ctx: RequestContext, input: StartEncounterInput): Promise<EncounterDetail> {
    try {
      return await this.prisma.tenant(ctx.organizationId, async (tx) => {
        const appt = await tx.appointment.findFirst({
          where: {
            id: input.appointmentId,
            organizationId: ctx.organizationId,
            branchId: ctx.branchId,
          },
        });
        if (!appt) throw new NotFoundError('Appointment');

        if (appt.patientId !== input.expectedPatientId) {
          // Recorded outside this transaction because throwing rolls it back.
          void this.audit.recordStandalone(ctx, {
            action: 'encounter.start',
            resourceType: 'appointment',
            resourceId: appt.id,
            outcome: 'DENIED',
            metadata: { reason: 'patient_mismatch' },
          });
          throw new ConflictError(
            'The selected patient does not match this appointment',
            ERROR_CODES.patientMismatch,
          );
        }
        if (appt.status !== 'CHECKED_IN')
          throw new InvalidTransitionError('Appointment', appt.status, 'IN_CONSULTATION');

        const claimed = await tx.appointment.updateMany({
          where: { id: appt.id, organizationId: ctx.organizationId, status: 'CHECKED_IN' },
          data: {
            status: 'IN_CONSULTATION',
            consultationStartedAt: new Date(),
            version: { increment: 1 },
          },
        });
        if (claimed.count === 0)
          throw new InvalidTransitionError('Appointment', 'changed', 'IN_CONSULTATION');

        const enc = await tx.encounter.create({
          data: {
            organizationId: ctx.organizationId,
            branchId: appt.branchId,
            patientId: appt.patientId,
            appointmentId: appt.id,
            attendingId: ctx.userId,
          },
        });
        await this.audit.record(tx, ctx, {
          action: 'encounter.start',
          resourceType: 'encounter',
          resourceId: enc.id,
          patientId: enc.patientId,
          metadata: { appointmentId: appt.id },
        });
        return this.detail(tx, ctx, enc.id);
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async finalize(ctx: RequestContext, id: string): Promise<EncounterDetail> {
    try {
      return await this.prisma.tenant(ctx.organizationId, async (tx) => {
        const enc = await this.load(tx, ctx, id);
        this.assertDraft(enc);
        this.assertAttending(ctx, enc);

        const note = await tx.clinicalNote.findUnique({ where: { encounterId: id } });
        const diagnoses = await tx.diagnosis.findMany({
          where: { encounterId: id, organizationId: ctx.organizationId },
        });
        const missing: string[] = [];
        if (!note?.chiefComplaint?.trim()) missing.push('chief complaint');
        if (!diagnoses.some((d) => d.type === 'PRIMARY')) missing.push('primary diagnosis');
        if (missing.length) {
          throw new DomainError(
            409,
            ERROR_CODES.documentationIncomplete,
            `Add the following before signing: ${missing.join(', ')}`,
            { missing },
          );
        }

        const now = new Date();
        // Draft orders become part of the record at the moment of signing.
        const activated = await tx.medicationOrder.updateMany({
          where: { encounterId: id, organizationId: ctx.organizationId, status: 'DRAFT' },
          data: { status: 'ACTIVE', activatedAt: now },
        });
        const result = await tx.encounter.updateMany({
          where: { id, organizationId: ctx.organizationId, status: 'IN_PROGRESS' },
          data: {
            status: 'FINALIZED',
            finalizedAt: now,
            finalizedById: ctx.userId,
            version: { increment: 1 },
          },
        });
        if (result.count === 0) throw locked('FINALIZED');

        if (enc.appointmentId) {
          await tx.appointment.updateMany({
            where: {
              id: enc.appointmentId,
              organizationId: ctx.organizationId,
              status: 'IN_CONSULTATION',
            },
            data: {
              status: 'COMPLETED',
              outcome: 'SEEN',
              completedAt: now,
              version: { increment: 1 },
            },
          });
        }
        await this.audit.record(tx, ctx, {
          action: 'encounter.finalize',
          resourceType: 'encounter',
          resourceId: id,
          patientId: enc.patientId,
          metadata: { diagnoses: diagnoses.length, ordersActivated: activated.count },
        });
        return this.detail(tx, ctx, id);
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async close(
    ctx: RequestContext,
    id: string,
    input: CloseEncounterInput,
  ): Promise<EncounterDetail> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const enc = await this.load(tx, ctx, id);
      if (!canTransitionEncounter(enc.status, 'CLOSED'))
        throw new InvalidTransitionError('Encounter', enc.status, 'CLOSED');
      const result = await tx.encounter.updateMany({
        where: { id, organizationId: ctx.organizationId, status: 'FINALIZED' },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedById: ctx.userId,
          disposition: input.disposition,
          dischargeInstructions: input.dischargeInstructions ?? null,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) throw new InvalidTransitionError('Encounter', 'changed', 'CLOSED');
      await this.audit.record(tx, ctx, {
        action: 'encounter.close',
        resourceType: 'encounter',
        resourceId: id,
        patientId: enc.patientId,
        metadata: { disposition: input.disposition },
      });
      return this.detail(tx, ctx, id);
    });
  }

  async void(ctx: RequestContext, id: string, input: VoidEncounterInput): Promise<EncounterDetail> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const enc = await this.load(tx, ctx, id);
      if (!canTransitionEncounter(enc.status, 'ENTERED_IN_ERROR')) {
        throw new InvalidTransitionError('Encounter', enc.status, 'ENTERED_IN_ERROR');
      }
      this.assertAttending(ctx, enc);
      const now = new Date();
      // Unlink from the appointment so the patient can be seen again against it.
      const result = await tx.encounter.updateMany({
        where: { id, organizationId: ctx.organizationId, status: 'IN_PROGRESS' },
        data: {
          status: 'ENTERED_IN_ERROR',
          voidedAt: now,
          voidedById: ctx.userId,
          voidReason: input.reason,
          appointmentId: null,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) throw locked('FINALIZED');
      if (enc.appointmentId) {
        await tx.appointment.updateMany({
          where: {
            id: enc.appointmentId,
            organizationId: ctx.organizationId,
            status: 'IN_CONSULTATION',
          },
          data: { status: 'CHECKED_IN', consultationStartedAt: null, version: { increment: 1 } },
        });
      }
      await this.audit.record(tx, ctx, {
        action: 'encounter.void',
        resourceType: 'encounter',
        resourceId: id,
        patientId: enc.patientId,
        metadata: { appointmentId: enc.appointmentId },
      });
      return this.detail(tx, ctx, id);
    });
  }

  // ── Documentation ──────────────────────────────────────────────────────────

  saveNote(
    ctx: RequestContext,
    id: string,
    input: SaveClinicalNoteInput,
  ): Promise<EncounterDetail> {
    return this.mutate(
      ctx,
      id,
      {
        attendingOnly: true,
        audit: 'encounter.note.save',
        metadata: { fields: Object.keys(input).join(',') },
      },
      async (tx, enc) => {
        await tx.clinicalNote.upsert({
          where: { encounterId: enc.id },
          create: {
            organizationId: ctx.organizationId,
            encounterId: enc.id,
            patientId: enc.patientId,
            updatedById: ctx.userId,
            ...input,
          },
          update: { ...input, updatedById: ctx.userId },
        });
      },
    );
  }

  recordVitals(
    ctx: RequestContext,
    id: string,
    input: RecordVitalsInput,
  ): Promise<EncounterDetail> {
    const { note, ...values } = input;
    return this.mutate(
      ctx,
      id,
      { attendingOnly: false, audit: 'encounter.vitals.record' },
      async (tx, enc) => {
        await tx.vitalSigns.create({
          data: {
            organizationId: ctx.organizationId,
            encounterId: enc.id,
            patientId: enc.patientId,
            recordedById: ctx.userId,
            note: note ?? null,
            ...values,
          },
        });
      },
    );
  }

  markVitalsInError(
    ctx: RequestContext,
    id: string,
    vitalsId: string,
    input: VoidEntryInput,
  ): Promise<EncounterDetail> {
    return this.mutate(
      ctx,
      id,
      { attendingOnly: false, audit: 'encounter.vitals.void', metadata: { vitalsId } },
      async (tx, enc) => {
        const vitals = await tx.vitalSigns.findFirst({
          where: { id: vitalsId, encounterId: enc.id, organizationId: ctx.organizationId },
        });
        if (!vitals) throw new NotFoundError('Vitals entry');
        if (vitals.recordedById !== ctx.userId && enc.attendingId !== ctx.userId) {
          throw new ForbiddenError(
            'Only the person who recorded this entry or the attending clinician can correct it',
          );
        }
        await tx.vitalSigns.update({
          where: { id: vitalsId },
          data: { enteredInError: true, errorReason: input.reason, errorMarkedById: ctx.userId },
        });
      },
    );
  }

  addDiagnosis(
    ctx: RequestContext,
    id: string,
    input: z.output<typeof addDiagnosisSchema>,
  ): Promise<EncounterDetail> {
    return this.mutate(
      ctx,
      id,
      { attendingOnly: true, audit: 'encounter.diagnosis.add' },
      async (tx, enc) => {
        await tx.diagnosis.create({
          data: {
            organizationId: ctx.organizationId,
            encounterId: enc.id,
            patientId: enc.patientId,
            recordedById: ctx.userId,
            description: input.description,
            icd10Code: input.icd10Code ?? null,
            type: input.type,
            certainty: input.certainty,
          },
        });
      },
    );
  }

  removeDiagnosis(ctx: RequestContext, id: string, diagnosisId: string): Promise<EncounterDetail> {
    return this.mutate(
      ctx,
      id,
      { attendingOnly: true, audit: 'encounter.diagnosis.remove', metadata: { diagnosisId } },
      async (tx, enc) => {
        const result = await tx.diagnosis.deleteMany({
          where: { id: diagnosisId, encounterId: enc.id, organizationId: ctx.organizationId },
        });
        if (result.count === 0) throw new NotFoundError('Diagnosis');
      },
    );
  }

  addMedicationOrder(
    ctx: RequestContext,
    id: string,
    input: z.output<typeof addMedicationOrderSchema>,
  ): Promise<EncounterDetail> {
    return this.mutate(
      ctx,
      id,
      { attendingOnly: true, audit: 'encounter.order.add' },
      async (tx, enc) => {
        await tx.medicationOrder.create({
          data: {
            organizationId: ctx.organizationId,
            encounterId: enc.id,
            patientId: enc.patientId,
            prescribedById: ctx.userId,
            drugName: input.drugName,
            strength: input.strength ?? null,
            form: input.form ?? null,
            route: input.route,
            dose: input.dose,
            frequency: input.frequency,
            durationDays: input.durationDays ?? null,
            quantity: input.quantity ?? null,
            instructions: input.instructions ?? null,
          },
        });
      },
    );
  }

  removeMedicationOrder(
    ctx: RequestContext,
    id: string,
    orderId: string,
  ): Promise<EncounterDetail> {
    return this.mutate(
      ctx,
      id,
      { attendingOnly: true, audit: 'encounter.order.remove', metadata: { orderId } },
      async (tx, enc) => {
        const result = await tx.medicationOrder.deleteMany({
          where: {
            id: orderId,
            encounterId: enc.id,
            organizationId: ctx.organizationId,
            status: 'DRAFT',
          },
        });
        if (result.count === 0) throw new NotFoundError('Draft medication order');
      },
    );
  }

  /** Cancels an order that was already signed. The order stays on the record, marked cancelled. */
  async cancelMedicationOrder(
    ctx: RequestContext,
    id: string,
    orderId: string,
    input: VoidEntryInput,
  ): Promise<EncounterDetail> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const enc = await this.load(tx, ctx, id);
      if (enc.status === 'IN_PROGRESS' || enc.status === 'ENTERED_IN_ERROR') {
        throw new ConflictError(
          'Only orders on a signed encounter can be cancelled; remove draft orders instead',
        );
      }
      const result = await tx.medicationOrder.updateMany({
        where: {
          id: orderId,
          encounterId: id,
          organizationId: ctx.organizationId,
          status: 'ACTIVE',
        },
        data: {
          status: 'CANCELLED',
          cancelReason: input.reason,
          cancelledAt: new Date(),
          cancelledById: ctx.userId,
        },
      });
      if (result.count === 0) throw new NotFoundError('Active medication order');
      await this.audit.record(tx, ctx, {
        action: 'encounter.order.cancel',
        resourceType: 'encounter',
        resourceId: id,
        patientId: enc.patientId,
        metadata: { orderId },
      });
      return this.detail(tx, ctx, id);
    });
  }

  async addAddendum(
    ctx: RequestContext,
    id: string,
    input: AddAddendumInput,
  ): Promise<EncounterDetail> {
    try {
      return await this.prisma.tenant(ctx.organizationId, async (tx) => {
        const enc = await this.load(tx, ctx, id);
        if (enc.status === 'IN_PROGRESS' || enc.status === 'ENTERED_IN_ERROR') {
          throw new ConflictError('Addenda can only be added once the encounter is signed');
        }
        await tx.addendum.create({
          data: {
            organizationId: ctx.organizationId,
            encounterId: id,
            patientId: enc.patientId,
            authorId: ctx.userId,
            text: input.text,
          },
        });
        await this.audit.record(tx, ctx, {
          action: 'encounter.addendum.add',
          resourceType: 'encounter',
          resourceId: id,
          patientId: enc.patientId,
        });
        return this.detail(tx, ctx, id);
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }
}

export { addDiagnosisSchema, addMedicationOrderSchema };
export type { AddDiagnosisInput, AddMedicationOrderInput };
