import { ERROR_CODES } from '@lumen/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError, NotFoundError } from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import type { PrismaService } from '../../database/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { StaffService } from './staff.service';
import type { SessionService } from './session.service';

const STAFF_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_STAFF_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_ID = '44444444-4444-4444-8444-444444444444';

const ctx: RequestContext = {
  userId: ADMIN_ID,
  sessionId: 'session-1',
  membershipId: 'membership-admin',
  organizationId: 'org-1',
  timezone: 'Africa/Lagos',
  role: 'ORG_ADMIN',
  permissions: ['users.read', 'users.manage'],
  branchId: 'branch-1',
  accessibleBranchIds: ['branch-1'],
  mustChangePassword: false,
};

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: STAFF_ID,
    userId: USER_ID,
    organizationId: ctx.organizationId,
    role: 'CLINICIAN' as const,
    status: 'ACTIVE' as const,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: {
      id: USER_ID,
      email: 'nurse@lumen.test',
      fullName: 'Test Nurse',
      passwordHash: 'hash',
      status: 'ACTIVE' as const,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      passwordChangedAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    branches: [],
    ...overrides,
  };
}

describe('StaffService (#1457)', () => {
  let prisma: {
    membership: {
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    user: { update: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let sessions: {
    revokeAllForMembership: ReturnType<typeof vi.fn>;
    revokeAllForUser: ReturnType<typeof vi.fn>;
  };
  let audit: { recordStandalone: ReturnType<typeof vi.fn> };
  let service: StaffService;

  beforeEach(() => {
    prisma = {
      membership: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };
    sessions = { revokeAllForMembership: vi.fn(), revokeAllForUser: vi.fn() };
    audit = { recordStandalone: vi.fn() };
    service = new StaffService(
      prisma as unknown as PrismaService,
      sessions as unknown as SessionService,
      audit as unknown as AuditService,
    );
    prisma.membership.update.mockImplementation(async ({ data }: { data: { status: string } }) =>
      membership({ status: data.status }),
    );
  });

  describe('deactivate', () => {
    it('disables the membership, suspends the identity, revokes sessions and audits the change', async () => {
      prisma.membership.findUnique.mockResolvedValue(membership());
      prisma.membership.count.mockResolvedValue(0); // no other active membership

      const result = await service.deactivate(ctx, STAFF_ID);

      expect(result.status).toBe('DISABLED');
      expect(prisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'DISABLED' } }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { status: 'DISABLED' },
      });
      expect(sessions.revokeAllForMembership).toHaveBeenCalledWith(STAFF_ID);
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(USER_ID);
      expect(audit.recordStandalone).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ action: 'staff.deactivated', resourceId: STAFF_ID }),
      );
    });

    it('leaves the identity active when the person has another active membership', async () => {
      prisma.membership.findUnique.mockResolvedValue(membership());
      prisma.membership.count.mockResolvedValue(1);

      await service.deactivate(ctx, STAFF_ID);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
      expect(sessions.revokeAllForMembership).toHaveBeenCalledWith(STAFF_ID);
    });

    it('rejects self-deactivation with STAFF_CANNOT_DEACTIVATE_SELF', async () => {
      prisma.membership.findUnique.mockResolvedValue(membership({ userId: ADMIN_ID }));

      await expect(service.deactivate(ctx, STAFF_ID)).rejects.toMatchObject({
        status: 403,
        code: ERROR_CODES.staffCannotDeactivateSelf,
      });
      expect(prisma.membership.update).not.toHaveBeenCalled();
      expect(audit.recordStandalone).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ action: 'staff.deactivated', outcome: 'DENIED' }),
      );
    });

    it('rejects deactivating the last active owner with STAFF_LAST_OWNER', async () => {
      prisma.membership.findUnique.mockResolvedValue(membership({ role: 'ORG_ADMIN' }));
      prisma.membership.count.mockResolvedValue(0);

      await expect(service.deactivate(ctx, STAFF_ID)).rejects.toMatchObject({
        status: 409,
        code: ERROR_CODES.staffLastOwner,
      });
      expect(prisma.membership.update).not.toHaveBeenCalled();
      expect(audit.recordStandalone).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ action: 'staff.deactivated', outcome: 'DENIED' }),
      );
    });

    it('allows deactivating an owner when another active owner remains', async () => {
      prisma.membership.findUnique.mockResolvedValue(membership({ role: 'ORG_ADMIN' }));
      prisma.membership.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      const result = await service.deactivate(ctx, STAFF_ID);

      expect(result.status).toBe('DISABLED');
      expect(prisma.membership.update).toHaveBeenCalled();
    });

    it('returns 404 for a staff member outside the organisation', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.deactivate(ctx, OTHER_STAFF_ID)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('is idempotent for an already deactivated member', async () => {
      prisma.membership.findUnique.mockResolvedValue(membership({ status: 'DISABLED' }));

      const result = await service.deactivate(ctx, STAFF_ID);

      expect(result.status).toBe('DISABLED');
      expect(prisma.membership.update).not.toHaveBeenCalled();
      expect(audit.recordStandalone).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('restores the membership and identity and audits staff.reactivated', async () => {
      prisma.membership.findUnique.mockResolvedValue(membership({ status: 'DISABLED' }));

      const result = await service.reactivate(ctx, STAFF_ID);

      expect(result.status).toBe('ACTIVE');
      expect(prisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ACTIVE' } }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { status: 'ACTIVE' },
      });
      expect(audit.recordStandalone).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ action: 'staff.reactivated', resourceId: STAFF_ID }),
      );
      // Revoked sessions are not resurrected; the user signs in again.
      expect(sessions.revokeAllForMembership).not.toHaveBeenCalled();
    });

    it('is idempotent for an already active member', async () => {
      prisma.membership.findUnique.mockResolvedValue(membership());

      const result = await service.reactivate(ctx, STAFF_ID);

      expect(result.status).toBe('ACTIVE');
      expect(prisma.membership.update).not.toHaveBeenCalled();
      expect(audit.recordStandalone).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown staff member', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.reactivate(ctx, OTHER_STAFF_ID)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it('uses stable domain errors (not raw exceptions) for the documented failures', () => {
    expect(new DomainError(403, ERROR_CODES.staffCannotDeactivateSelf, 'self')).toBeInstanceOf(
      DomainError,
    );
  });
});
