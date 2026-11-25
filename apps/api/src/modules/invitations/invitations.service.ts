import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  passwordSchema,
  toPage,
  type InvitationInspection,
  type InvitationListQuery,
  type InvitationState,
  type InvitationView,
  type Page,
  type Role,
} from '@lumen/contracts';
import { Prisma } from '../../generated/prisma/client';
import { ConflictError, DomainError, NotFoundError, ValidationError } from '../../common/errors';
import { ERROR_CODES } from '@lumen/contracts';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { PrismaService, type Tx } from '../../database/prisma.service';
import { AuditService, type PlatformActor } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PasswordService } from '../identity/password.service';
import { SessionService, hashToken } from '../identity/session.service';

const invitationInclude = {
  organization: { select: { name: true } },
  invitedBy: { select: { fullName: true } },
  branches: { include: { branch: { select: { id: true, name: true } } } },
} satisfies Prisma.InvitationInclude;
type InvitationRow = Prisma.InvitationGetPayload<{ include: typeof invitationInclude }>;

const UNAVAILABLE = () =>
  new DomainError(
    410,
    ERROR_CODES.invitationUnavailable,
    'This invitation is no longer available. Ask your administrator for a new one.',
  );

/** Which organisation roles an organisation administrator may hand out. Platform roles can never be granted. */
export function canGrantRole(actorRole: Role, target: Role): boolean {
  return (
    actorRole === 'ORG_ADMIN' && ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'FRONT_DESK'].includes(target)
  );
}

export function invitationState(
  row: { status: string; expiresAt: Date },
  now = new Date(),
): InvitationState {
  if (row.status === 'PENDING') return row.expiresAt > now ? 'PENDING' : 'EXPIRED';
  return row.status as InvitationState;
}

export interface NewInvitation {
  organizationId: string;
  email: string;
  fullName: string;
  role: Role;
  branchIds: string[];
  invitedByUserId: string;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ── Creation ────────────────────────────────────────────────────────────────

  /**
   * Creates a pending invitation inside `tx` (whose organisation context must already be set) and returns
   * the raw token. The token exists only in memory and in the email; the database keeps its hash.
   * Call {@link deliver} after the transaction commits.
   */
  async createInTx(
    tx: Tx,
    actor: PlatformActor,
    input: NewInvitation,
  ): Promise<{ id: string; token: string }> {
    const email = input.email.trim().toLowerCase();
    const branchIds = [...new Set(input.branchIds)];

    const org = await tx.organization.findUnique({ where: { id: input.organizationId } });
    if (!org) throw new NotFoundError('Organisation');
    if (org.status !== 'ACTIVE')
      throw new ConflictError('That organisation is suspended', ERROR_CODES.organizationSuspended);

    const found = await tx.branch.count({
      where: { organizationId: input.organizationId, id: { in: branchIds }, active: true },
    });
    if (found !== branchIds.length) throw new ValidationError('One or more branches do not exist');

    const user = await tx.user.findUnique({ where: { email } });
    if (user?.platformRole) {
      throw new ValidationError('That email address cannot be invited to a hospital', {
        fields: [{ path: 'email', message: 'Not available' }],
      });
    }
    if (user) {
      const member = await tx.membership.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId: input.organizationId } },
      });
      if (member?.status === 'ACTIVE')
        throw new ConflictError('That person already belongs to this organisation');
    }

    const token = randomBytes(32).toString('base64url');
    let created;
    try {
      created = await tx.invitation.create({
        data: {
          organizationId: input.organizationId,
          email,
          fullName: input.fullName,
          role: input.role,
          tokenHash: hashToken(token),
          expiresAt: this.expiry(),
          invitedByUserId: input.invitedByUserId,
          branches: {
            create: branchIds.map((branchId) => ({ branchId })),
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictError('There is already a pending invitation for that email');
      throw error;
    }
    await this.audit.recordPlatform(
      actor,
      {
        action: 'invitation.create',
        resourceType: 'invitation',
        resourceId: created.id,
        metadata: { role: input.role, branchCount: branchIds.length },
      },
      input.organizationId,
      tx,
    );
    return { id: created.id, token };
  }

  /** Creates an invitation in its own tenant transaction, then sends it. */
  async create(actor: PlatformActor, input: NewInvitation): Promise<InvitationView> {
    const { id, token } = await this.prisma.tenant(input.organizationId, (tx) =>
      this.createInTx(tx, actor, input),
    );
    return this.deliver(id, token);
  }

  private expiry(): Date {
    return new Date(Date.now() + this.config.INVITATION_TTL_HOURS * 3_600_000);
  }

  /** Sends the invitation email and records the true outcome. Never throws for a delivery failure. */
  async deliver(invitationId: string, token: string): Promise<InvitationView> {
    const inv = await this.prisma.invitation.findUniqueOrThrow({
      where: { id: invitationId },
      include: invitationInclude,
    });
    if (!this.config.APP_BASE_URL)
      return this.markUndelivered(invitationId, 'APP_BASE_URL is not configured on this server');
    const link = `${this.config.APP_BASE_URL.replace(/\/$/, '')}/accept-invitation#token=${token}`;
    const hours = this.config.INVITATION_TTL_HOURS;
    const text =
      `Hello ${inv.fullName},\n\nYou have been invited to join ${inv.organization.name} on LumenHealth.\n\n` +
      `Accept the invitation and set up your access:\n${link}\n\n` +
      `The link works once and expires in ${Math.round(hours / 24) || 1} day(s). If you did not expect this, ignore this email.\n`;
    const result = await this.email.send({
      to: inv.email,
      subject: `You're invited to ${inv.organization.name} on LumenHealth`,
      text,
      html: `<p>Hello ${escapeHtml(inv.fullName)},</p><p>You have been invited to join <strong>${escapeHtml(inv.organization.name)}</strong> on LumenHealth.</p><p><a href="${link}">Accept the invitation and set up your access</a></p><p>The link works once and expires in ${Math.round(hours / 24) || 1} day(s). If you did not expect this, ignore this email.</p>`,
    });
    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        deliveryStatus: result.ok ? 'SENT' : 'FAILED',
        deliveryError: result.ok ? null : result.reason.slice(0, 200),
        sendCount: { increment: result.ok ? 1 : 0 },
        lastSentAt: result.ok ? new Date() : undefined,
      },
      include: invitationInclude,
    });
    return this.view(updated);
  }

  private async markUndelivered(id: string, reason: string): Promise<InvitationView> {
    const row = await this.prisma.invitation.update({
      where: { id },
      data: { deliveryStatus: 'FAILED', deliveryError: reason },
      include: invitationInclude,
    });
    return this.view(row);
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  view(row: InvitationRow): InvitationView {
    return {
      id: row.id,
      organizationId: row.organizationId,
      organizationName: row.organization.name,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      branches: row.branches.map((b) => b.branch).sort((a, b) => a.name.localeCompare(b.name)),
      state: invitationState(row),
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      invitedByName: row.invitedBy.fullName,
      delivery: row.deliveryStatus,
      deliveryError: row.deliveryError,
      sendCount: row.sendCount,
      lastSentAt: row.lastSentAt?.toISOString() ?? null,
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
    };
  }

  async list(
    scope: { organizationId?: string },
    q: Pick<InvitationListQuery, 'state' | 'page' | 'pageSize'>,
  ): Promise<Page<InvitationView>> {
    const now = new Date();
    const stateFilter: Prisma.InvitationWhereInput =
      q.state === 'PENDING'
        ? { status: 'PENDING', expiresAt: { gt: now } }
        : q.state === 'EXPIRED'
          ? { status: 'PENDING', expiresAt: { lte: now } }
          : q.state
            ? { status: q.state }
            : {};
    const where: Prisma.InvitationWhereInput = {
      ...(scope.organizationId ? { organizationId: scope.organizationId } : {}),
      ...stateFilter,
    };
    const [rows, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        include: invitationInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.invitation.count({ where }),
    ]);
    return toPage(
      rows.map((r) => this.view(r)),
      total,
      q.page,
      q.pageSize,
    );
  }

  /** `organizationId` limits the lookup to one organisation: an organisation admin can never reach another's. */
  private async find(id: string, organizationId?: string) {
    const row = await this.prisma.invitation.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
      include: invitationInclude,
    });
    if (!row) throw new NotFoundError('Invitation');
    return row;
  }

  // ── Resend and revoke ───────────────────────────────────────────────────────

  /** Issues a fresh token (the old link stops working), extends the expiry and sends again. */
  async resend(actor: PlatformActor, id: string, organizationId?: string): Promise<InvitationView> {
    const current = await this.find(id, organizationId);
    if (current.status !== 'PENDING')
      throw new ConflictError(`A ${current.status.toLowerCase()} invitation cannot be resent`);
    const token = randomBytes(32).toString('base64url');
    await this.prisma.tenant(current.organizationId, async (tx) => {
      const org = await tx.organization.findUniqueOrThrow({
        where: { id: current.organizationId },
      });
      if (org.status !== 'ACTIVE')
        throw new ConflictError(
          'That organisation is suspended',
          ERROR_CODES.organizationSuspended,
        );
      const moved = await tx.invitation.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          tokenHash: hashToken(token),
          expiresAt: this.expiry(),
          deliveryStatus: 'PENDING',
          deliveryError: null,
        },
      });
      if (moved.count !== 1) throw new ConflictError('That invitation is no longer pending');
      await this.audit.recordPlatform(
        actor,
        { action: 'invitation.resend', resourceType: 'invitation', resourceId: id },
        current.organizationId,
        tx,
      );
    });
    return this.deliver(id, token);
  }

  async revoke(actor: PlatformActor, id: string, organizationId?: string): Promise<InvitationView> {
    const current = await this.find(id, organizationId);
    await this.prisma.tenant(current.organizationId, async (tx) => {
      const done = await tx.invitation.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      if (done.count !== 1)
        throw new ConflictError(`A ${current.status.toLowerCase()} invitation cannot be revoked`);
      await this.audit.recordPlatform(
        actor,
        { action: 'invitation.revoke', resourceType: 'invitation', resourceId: id },
        current.organizationId,
        tx,
      );
    });
    return this.view(await this.find(id, organizationId));
  }

  // ── Public: inspect and accept ──────────────────────────────────────────────

  /** What the holder of a token may learn. Unknown and malformed tokens are indistinguishable. */
  async inspect(token: string): Promise<InvitationInspection> {
    const row = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { organization: { select: { name: true, status: true } } },
    });
    if (!row) return { state: 'UNAVAILABLE' };
    const state = invitationState(row);
    if (state !== 'PENDING' || row.organization.status !== 'ACTIVE')
      return {
        state: state === 'PENDING' ? 'UNAVAILABLE' : state,
        organizationName: row.organization.name,
      };
    const existing = await this.prisma.user.findUnique({
      where: { email: row.email },
      select: { id: true },
    });
    return {
      state: 'PENDING',
      organizationName: row.organization.name,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      existingAccount: !!existing,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  /**
   * Accepts an invitation. New people choose their password; people who already have an account prove
   * it with their current password, which is never changed, and keep every existing membership.
   * Everything happens in one transaction and the invitation is claimed with a conditional update, so
   * two simultaneous attempts cannot both succeed.
   */
  async accept(
    token: string,
    password: string,
    client: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<void> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { branches: true, organization: true },
    });
    if (!invitation) {
      await this.passwords.verifyDecoy(password);
      throw UNAVAILABLE();
    }
    if (invitationState(invitation) !== 'PENDING' || invitation.organization.status !== 'ACTIVE')
      throw UNAVAILABLE();

    const existing = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) {
      if (existing.platformRole || existing.status !== 'ACTIVE') throw UNAVAILABLE();
      if (!(await this.passwords.verify(existing.passwordHash, password)))
        throw new ValidationError('Incorrect password for your existing account', {
          fields: [{ path: 'password', message: 'Incorrect password' }],
        });
    }
    let passwordHash: string | undefined;
    if (!existing) {
      const parsed = passwordSchema.safeParse(password);
      if (!parsed.success)
        throw new ValidationError('The password is not acceptable', {
          fields: [
            { path: 'password', message: parsed.error.issues[0]?.message ?? 'Invalid password' },
          ],
        });
      passwordHash = await this.passwords.hash(password);
    }

    const orgId = invitation.organizationId;
    let revokeMembershipId: string | undefined;
    try {
      await this.prisma.tenant(orgId, async (tx) => {
        const user =
          existing ??
          (await tx.user.create({
            data: {
              email: invitation.email,
              fullName: invitation.fullName,
              passwordHash: passwordHash!,
            },
          }));

        const claimed = await tx.invitation.updateMany({
          where: { id: invitation.id, status: 'PENDING', expiresAt: { gt: new Date() } },
          data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedByUserId: user.id },
        });
        if (claimed.count !== 1) throw UNAVAILABLE();

        const branchIds = invitation.branches.map((b) => b.branchId);
        const current = await tx.membership.findUnique({
          where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
        });
        if (current?.status === 'ACTIVE') throw UNAVAILABLE();
        let membershipId: string;
        if (current) {
          // A previously disabled member is re-admitted only because an administrator explicitly invited them.
          await tx.membershipBranch.deleteMany({
            where: { membershipId: current.id, organizationId: orgId },
          });
          await tx.membership.update({
            where: { id: current.id },
            data: { role: invitation.role, status: 'ACTIVE' },
          });
          membershipId = current.id;
          revokeMembershipId = current.id;
        } else {
          membershipId = (
            await tx.membership.create({
              data: { userId: user.id, organizationId: orgId, role: invitation.role },
            })
          ).id;
        }
        await tx.membershipBranch.createMany({
          data: branchIds.map((branchId) => ({ membershipId, branchId, organizationId: orgId })),
        });
        await this.audit.record(
          tx,
          { userId: user.id, organizationId: orgId, ...client },
          {
            action: 'invitation.accept',
            resourceType: 'invitation',
            resourceId: invitation.id,
            metadata: {
              role: invitation.role,
              branchCount: branchIds.length,
              existingAccount: !!existing,
              membershipId,
            },
          },
        );
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw UNAVAILABLE();
      throw error;
    }
    if (revokeMembershipId) await this.sessions.revokeAllForMembership(revokeMembershipId);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
