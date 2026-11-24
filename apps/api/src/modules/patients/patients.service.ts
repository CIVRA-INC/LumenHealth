import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  normalizePhone,
  type CreatePatientParsed,
  type DuplicateCandidate,
  type DuplicateCheckInput,
  type EncounterListItem,
  type Page,
  toPage,
  type PatientDetail,
  type PatientSearchQuery,
  type PatientSummary,
} from '@lumen/contracts';
import { z } from 'zod';
import { ConflictError, NotFoundError } from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService, type Tx } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { nameKey, normalizeIdentifier, toPatientDetail, toPatientSummary } from './patient.mapper';
import { updatePatientSchema } from '@lumen/contracts';

const detailInclude = {
  identifiers: true,
  emergencyContacts: true,
} satisfies Prisma.PatientInclude;

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Duplicate detection ────────────────────────────────────────────────────

  private async findDuplicates(
    tx: Tx,
    ctx: RequestContext,
    input: Pick<DuplicateCheckInput, 'givenName' | 'familyName' | 'dateOfBirth'> & {
      phone?: string;
      identifiers?: { type: 'NATIONAL_ID' | 'PASSPORT' | 'DRIVERS_LICENSE'; value: string }[];
    },
  ): Promise<DuplicateCandidate[]> {
    const dob = new Date(`${input.dateOfBirth}T00:00:00Z`);
    const identifierFilters = (input.identifiers ?? []).map((i) => ({
      type: i.type,
      value: normalizeIdentifier(i.value),
    }));
    const rows = await tx.patient.findMany({
      where: {
        organizationId: ctx.organizationId,
        OR: [
          { nameKey: nameKey(input.givenName, input.familyName), dateOfBirth: dob },
          ...(input.phone ? [{ phone: input.phone, dateOfBirth: dob }] : []),
          ...(identifierFilters.length
            ? [{ identifiers: { some: { OR: identifierFilters } } }]
            : []),
        ],
      },
      include: { identifiers: true },
      take: 10,
    });
    return rows.map((p) => {
      const reasons: DuplicateCandidate['reasons'] = [];
      if (
        p.nameKey === nameKey(input.givenName, input.familyName) &&
        p.dateOfBirth.getTime() === dob.getTime()
      ) {
        reasons.push('SAME_NAME_AND_DOB');
      }
      if (input.phone && p.phone === input.phone && p.dateOfBirth.getTime() === dob.getTime()) {
        reasons.push('SAME_PHONE_AND_DOB');
      }
      if (
        p.identifiers.some((i) =>
          identifierFilters.some((f) => f.type === i.type && f.value === i.value),
        )
      ) {
        reasons.push('SAME_IDENTIFIER');
      }
      return { ...toPatientSummary(p), reasons };
    });
  }

  async duplicateCheck(
    ctx: RequestContext,
    input: DuplicateCheckInput,
  ): Promise<DuplicateCandidate[]> {
    const parsed = input as DuplicateCheckInput & { phone?: string };
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const candidates = await this.findDuplicates(tx, ctx, {
        ...parsed,
        identifiers: parsed.identifiers ?? [],
      });
      await this.audit.record(tx, ctx, {
        action: 'patient.duplicate_check',
        resourceType: 'patient',
        metadata: { matches: candidates.length },
      });
      return candidates;
    });
  }

  // ── Registration ───────────────────────────────────────────────────────────

  async create(ctx: RequestContext, input: CreatePatientParsed): Promise<PatientDetail> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const candidates = await this.findDuplicates(tx, ctx, input);

      const identifierClash = candidates.filter((c) => c.reasons.includes('SAME_IDENTIFIER'));
      if (identifierClash.length) {
        // The same national ID or passport always means the same person: never overridable.
        throw new ConflictError(
          'A patient with this identifier is already registered',
          ERROR_CODES.duplicateIdentifier,
          { candidates: identifierClash },
        );
      }
      if (candidates.length && !input.confirmNotDuplicate) {
        throw new ConflictError(
          'This may be a patient who is already registered',
          ERROR_CODES.duplicatePatient,
          { candidates },
        );
      }

      // Atomic, gap-free MRN sequence per organisation. The row lock serialises concurrent registrations.
      const counter = await tx.counter.upsert({
        where: {
          organizationId_scope: { organizationId: ctx.organizationId, scope: 'patient-mrn' },
        },
        create: { organizationId: ctx.organizationId, scope: 'patient-mrn', value: 1 },
        update: { value: { increment: 1 } },
      });
      const mrn = `LH-${String(counter.value).padStart(6, '0')}`;

      const patient = await tx.patient.create({
        data: {
          organizationId: ctx.organizationId,
          mrn,
          givenName: input.givenName,
          middleName: input.middleName || null,
          familyName: input.familyName,
          dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00Z`),
          sex: input.sex,
          phone: input.phone,
          email: input.email?.toLowerCase() ?? null,
          addressLine1: input.address?.line1 ?? null,
          city: input.address?.city ?? null,
          state: input.address?.state ?? null,
          country: input.address?.country ?? 'NG',
          nameKey: nameKey(input.givenName, input.familyName),
          registeredBranchId: ctx.branchId,
          createdById: ctx.userId,
          updatedById: ctx.userId,
          identifiers: {
            create: input.identifiers.map((i) => ({
              type: i.type,
              value: normalizeIdentifier(i.value),
            })),
          },
          emergencyContacts: {
            create: input.emergencyContacts,
          },
        },
        include: detailInclude,
      });
      await this.audit.record(tx, ctx, {
        action: 'patient.create',
        resourceType: 'patient',
        resourceId: patient.id,
        patientId: patient.id,
        metadata: { overrodeDuplicateWarning: candidates.length > 0 },
      });
      return toPatientDetail(patient);
    });
  }

  // ── Retrieval ──────────────────────────────────────────────────────────────

  async get(ctx: RequestContext, id: string): Promise<PatientDetail> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id, organizationId: ctx.organizationId },
        include: detailInclude,
      });
      if (!patient) throw new NotFoundError('Patient');
      await this.audit.record(tx, ctx, {
        action: 'patient.read',
        resourceType: 'patient',
        resourceId: patient.id,
        patientId: patient.id,
      });
      return toPatientDetail(patient);
    });
  }

  async search(ctx: RequestContext, query: PatientSearchQuery): Promise<Page<PatientSummary>> {
    const tokens = (query.q ?? '')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 4);

    const where: Prisma.PatientWhereInput = {
      organizationId: ctx.organizationId,
      AND: tokens.map((token) => {
        const phone = normalizePhone(token);
        return {
          OR: [
            { givenName: { contains: token, mode: 'insensitive' as const } },
            { familyName: { contains: token, mode: 'insensitive' as const } },
            { middleName: { contains: token, mode: 'insensitive' as const } },
            { mrn: { contains: token, mode: 'insensitive' as const } },
            ...(phone ? [{ phone }] : []),
            ...(/^\d{4,}$/.test(token) ? [{ phone: { endsWith: token } }] : []),
          ],
        };
      }),
    };

    // Only whitelisted columns can be sorted on; the direction is validated by the contract.
    const sortKey = query.sort ?? (tokens.length ? 'name' : 'registered');
    const dir = query.order ?? (sortKey === 'registered' ? 'desc' : 'asc');
    const orderBy: Prisma.PatientOrderByWithRelationInput[] = [
      ...{
        name: [{ familyName: dir }, { givenName: dir }],
        mrn: [{ mrn: dir }],
        dateOfBirth: [{ dateOfBirth: dir }],
        registered: [{ createdAt: dir }],
      }[sortKey],
      { id: dir }, // deterministic tie-break so pages never repeat or skip rows
    ];

    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      // Queries inside a transaction share one connection, so they run one after another.
      const rows = await tx.patient.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await tx.patient.count({ where });
      // The search text is deliberately not recorded: it often contains names or phone numbers.
      await this.audit.record(tx, ctx, {
        action: 'patient.search',
        resourceType: 'patient',
        metadata: { results: rows.length, hasQuery: tokens.length > 0 },
      });
      return toPage(rows.map(toPatientSummary), total, query.page, query.pageSize);
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    ctx: RequestContext,
    id: string,
    input: z.output<typeof updatePatientSchema>,
  ): Promise<PatientDetail> {
    const { version, emergencyContacts, address, ...fields } = input;
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const existing = await tx.patient.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!existing) throw new NotFoundError('Patient');
      if (existing.version !== version) {
        throw new ConflictError(
          'This record was changed by someone else. Reload it and try again.',
          ERROR_CODES.staleVersion,
        );
      }

      const data: Prisma.PatientUpdateManyMutationInput = {
        ...(fields.givenName !== undefined ? { givenName: fields.givenName } : {}),
        ...(fields.middleName !== undefined ? { middleName: fields.middleName || null } : {}),
        ...(fields.familyName !== undefined ? { familyName: fields.familyName } : {}),
        ...(fields.dateOfBirth !== undefined
          ? { dateOfBirth: new Date(`${fields.dateOfBirth}T00:00:00Z`) }
          : {}),
        ...(fields.sex !== undefined ? { sex: fields.sex } : {}),
        ...(fields.phone !== undefined ? { phone: fields.phone } : {}),
        ...(fields.email !== undefined ? { email: fields.email?.toLowerCase() ?? null } : {}),
        ...(address !== undefined
          ? {
              addressLine1: address?.line1 ?? null,
              city: address?.city ?? null,
              state: address?.state ?? null,
              country: address?.country ?? 'NG',
            }
          : {}),
      };
      const givenName = fields.givenName ?? existing.givenName;
      const familyName = fields.familyName ?? existing.familyName;
      if (fields.givenName !== undefined || fields.familyName !== undefined) {
        data.nameKey = nameKey(givenName, familyName);
      }

      // Compare-and-set on version closes the race between the check above and this write.
      const result = await tx.patient.updateMany({
        where: { id, organizationId: ctx.organizationId, version },
        data: { ...data, version: { increment: 1 }, updatedById: ctx.userId },
      });
      if (result.count === 0) {
        throw new ConflictError(
          'This record was changed by someone else. Reload it and try again.',
          ERROR_CODES.staleVersion,
        );
      }
      if (emergencyContacts !== undefined) {
        await tx.emergencyContact.deleteMany({
          where: { patientId: id, organizationId: ctx.organizationId },
        });
        await tx.emergencyContact.createMany({
          data: emergencyContacts.map((c) => ({
            organizationId: ctx.organizationId,
            patientId: id,
            ...c,
          })),
        });
      }
      const patient = await tx.patient.findFirstOrThrow({
        where: { id, organizationId: ctx.organizationId },
        include: detailInclude,
      });
      await this.audit.record(tx, ctx, {
        action: 'patient.update',
        resourceType: 'patient',
        resourceId: id,
        patientId: id,
        metadata: {
          fields: [
            ...Object.keys(fields),
            ...(address !== undefined ? ['address'] : []),
            ...(emergencyContacts ? ['emergencyContacts'] : []),
          ],
        },
      });
      return toPatientDetail(patient);
    });
  }

  // ── History ────────────────────────────────────────────────────────────────

  async encounterHistory(ctx: RequestContext, patientId: string): Promise<EncounterListItem[]> {
    return this.prisma.tenant(ctx.organizationId, async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: patientId, organizationId: ctx.organizationId },
      });
      if (!patient) throw new NotFoundError('Patient');
      const rows = await tx.encounter.findMany({
        where: {
          organizationId: ctx.organizationId,
          patientId,
          // History is limited to branches the user may access.
          branchId: { in: [...ctx.accessibleBranchIds] },
          status: { not: 'ENTERED_IN_ERROR' },
        },
        orderBy: { startedAt: 'desc' },
        take: 50,
        include: { diagnoses: { where: { type: 'PRIMARY' }, take: 1 } },
      });
      const attendingIds = [...new Set(rows.map((r) => r.attendingId))];
      const users = await tx.user.findMany({
        where: { id: { in: attendingIds } },
        select: { id: true, fullName: true },
      });
      const names = new Map(users.map((u) => [u.id, u.fullName]));
      await this.audit.record(tx, ctx, {
        action: 'patient.history.read',
        resourceType: 'patient',
        resourceId: patientId,
        patientId,
        metadata: { count: rows.length },
      });
      return rows.map((e) => ({
        id: e.id,
        status: e.status,
        startedAt: e.startedAt.toISOString(),
        attending: { userId: e.attendingId, fullName: names.get(e.attendingId) ?? 'Unknown' },
        primaryDiagnosis: e.diagnoses[0]?.description ?? null,
      }));
    });
  }
}
