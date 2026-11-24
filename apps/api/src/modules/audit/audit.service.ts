import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { RequestContext } from '../../common/request-context';
import { PrismaService, type Tx } from '../../database/prisma.service';

/** The part of a request context an audit row needs. */
export type AuditActor = Pick<
  RequestContext,
  'userId' | 'organizationId' | 'ip' | 'userAgent' | 'requestId'
>;

export interface AuditEntry {
  action: string;
  resourceType: string;
  resourceId?: string;
  patientId?: string;
  outcome?: 'SUCCESS' | 'DENIED' | 'FAILURE';
  /** Identifiers and counts only. Never clinical content, credentials or free-text patient data. */
  metadata?: Record<string, string | number | boolean | string[] | null>;
}

/**
 * Writes to the append-only audit trail. Within a tenant transaction use {@link record} so the
 * audit row commits atomically with the change it describes.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  private row(ctx: AuditActor, entry: AuditEntry): Prisma.AuditEventCreateManyInput {
    return {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      patientId: entry.patientId,
      outcome: entry.outcome ?? 'SUCCESS',
      metadata: entry.metadata,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent?.slice(0, 300),
      requestId: ctx.requestId,
    };
  }

  /** Record inside an existing tenant transaction. */
  async record(tx: Tx, ctx: AuditActor, entry: AuditEntry): Promise<void> {
    // createMany issues a plain INSERT (no RETURNING), which the audit RLS policy permits.
    await tx.auditEvent.createMany({ data: [this.row(ctx, entry)] });
  }

  /** Record in its own transaction, e.g. for denied attempts where the main operation never ran. */
  async recordStandalone(ctx: AuditActor, entry: AuditEntry): Promise<void> {
    await this.prisma.tenant(ctx.organizationId, (tx) => this.record(tx, ctx, entry));
  }

  /** Events that occur before any organisation context exists (e.g. failed sign-in). */
  async recordUnscoped(
    entry: AuditEntry & {
      actorUserId?: string;
      ip?: string;
      userAgent?: string;
      requestId?: string;
    },
  ) {
    await this.prisma.auditEvent.createMany({
      data: [
        {
          organizationId: null,
          actorUserId: entry.actorUserId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          outcome: entry.outcome ?? 'SUCCESS',
          metadata: entry.metadata,
          ipAddress: entry.ip,
          userAgent: entry.userAgent?.slice(0, 300),
          requestId: entry.requestId,
        },
      ],
    });
  }
}
