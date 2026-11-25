import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../config/env';
import type { PrismaService } from '../../database/prisma.service';
import { hashToken, SessionService } from './session.service';

const TOKEN = 'previously-issued-token';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const config = { SESSION_IDLE_TIMEOUT_MINUTES: 60 } as AppConfig;

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    tokenHash: hashToken(TOKEN),
    userId: '22222222-2222-4222-8222-222222222222',
    membershipId: '33333333-3333-4333-8333-333333333333',
    branchId: '44444444-4444-4444-8444-444444444444',
    createdAt: new Date('2026-01-01'),
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + 3_600_000),
    revokedAt: null,
    user: {
      id: '22222222-2222-4222-8222-222222222222',
      status: 'ACTIVE' as const,
      mustChangePassword: false,
    },
    branch: { active: true },
    membership: {
      id: '33333333-3333-4333-8333-333333333333',
      organizationId: '55555555-5555-4555-8555-555555555555',
      status: 'ACTIVE' as const,
      role: 'NURSE' as const,
      organization: { timezone: 'Africa/Lagos' },
      branches: [{ branchId: '44444444-4444-4444-8444-444444444444', branch: { active: true } }],
    },
    ...overrides,
  };
}

function serviceWith(row: ReturnType<typeof session>) {
  const prisma = {
    session: {
      findUnique: vi.fn().mockResolvedValue(row),
      update: vi.fn(),
    },
  };
  return {
    prisma,
    service: new SessionService(prisma as unknown as PrismaService, config),
  };
}

describe('SessionService (#1457)', () => {
  it('resolves an active session into a request context', async () => {
    const { prisma, service } = serviceWith(session());

    const ctx = await service.resolve(TOKEN);

    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(TOKEN) },
      include: {
        user: true,
        branch: true,
        membership: { include: { organization: true, branches: { include: { branch: true } } } },
      },
    });
    expect(ctx).toMatchObject({
      role: 'NURSE',
      organizationId: session().membership.organizationId,
      branchId: session().branchId,
      permissions: expect.arrayContaining(['patients.read']),
    });
  });

  it('refuses a previously issued token once the identity is disabled', async () => {
    const { service } = serviceWith(session({ user: { ...session().user, status: 'DISABLED' } }));

    await expect(service.resolve(TOKEN)).resolves.toBeNull();
  });

  it('refuses a previously issued token once the membership is disabled', async () => {
    const { service } = serviceWith(
      session({ membership: { ...session().membership, status: 'DISABLED' } }),
    );

    await expect(service.resolve(TOKEN)).resolves.toBeNull();
  });

  it('refuses a revoked session', async () => {
    const { service } = serviceWith(session({ revokedAt: new Date('2026-01-02') }));

    await expect(service.resolve(TOKEN)).resolves.toBeNull();
  });
});
