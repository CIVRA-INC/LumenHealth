import { ERROR_CODES } from '@lumen/contracts';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp, createWorld, ownerClient, signIn, TEST_PASSWORD, type World } from './helpers';

const owner = ownerClient();
let app: NestExpressApplication;
let world: World;

beforeAll(async () => {
  app = await createApp();
  world = await createWorld(owner, 'staff');
});

afterAll(async () => {
  await app?.close();
  await owner.$disconnect();
});

describe('staff deactivation (#1457)', () => {
  it('revokes access, audits both actions, and restores access after reactivation', async () => {
    const admin = await signIn(app, world.users.admin.email);
    const victim = await signIn(app, world.users.clinician.email);
    const target = world.users.clinician;
    expect((await victim.get('/api/v1/auth/session')).status).toBe(200);

    const deactivated = await admin
      .patch(`/api/v1/staff/${target.membershipId}/deactivate`)
      .send({});
    expect(deactivated.status).toBe(200);
    expect(deactivated.body).toMatchObject({
      membershipId: target.membershipId,
      status: 'DISABLED',
    });

    const user = await owner.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(user.status).toBe('DISABLED');
    const sessions = await owner.session.findMany({ where: { userId: target.id } });
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);

    // Previously issued tokens no longer resolve, so login, refresh and guarded routes all fail.
    const staleSession = await victim.get('/api/v1/auth/session');
    expect(staleSession.status).toBe(401);
    expect(staleSession.body.error.code).toBe('UNAUTHENTICATED');
    expect((await victim.get('/api/v1/patients')).status).toBe(401);
    const blockedLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: target.email, password: TEST_PASSWORD });
    expect(blockedLogin.status).toBe(401);

    const deactivationAudit = await owner.auditEvent.findMany({
      where: {
        organizationId: world.orgId,
        action: 'staff.deactivated',
        resourceId: target.membershipId,
      },
    });
    expect(deactivationAudit).toHaveLength(1);
    expect(deactivationAudit[0]).toMatchObject({
      actorUserId: world.users.admin.id,
      outcome: 'SUCCESS',
    });

    const reactivated = await admin
      .patch(`/api/v1/admin/users/${target.membershipId}/reactivate`)
      .send({});
    expect(reactivated.status).toBe(200);
    expect(reactivated.body).toMatchObject({
      membershipId: target.membershipId,
      status: 'ACTIVE',
    });
    expect((await owner.user.findUniqueOrThrow({ where: { id: target.id } })).status).toBe(
      'ACTIVE',
    );

    const renewed = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: target.email, password: TEST_PASSWORD });
    expect(renewed.status).toBe(200);

    const reactivationAudit = await owner.auditEvent.findMany({
      where: {
        organizationId: world.orgId,
        action: 'staff.reactivated',
        resourceId: target.membershipId,
      },
    });
    expect(reactivationAudit).toHaveLength(1);
    expect(reactivationAudit[0]?.actorUserId).toBe(world.users.admin.id);
  });

  it('rejects self-deactivation with the documented error code', async () => {
    const admin = await signIn(app, world.users.admin.email);

    const res = await admin
      .patch(`/api/v1/staff/${world.users.admin.membershipId}/deactivate`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ERROR_CODES.staffCannotDeactivateSelf);
  });

  it('does not deactivate staff from another organisation', async () => {
    const admin = await signIn(app, world.users.admin.email);
    const stranger = await createWorld(owner, 'staff-other');

    const res = await admin
      .patch(`/api/v1/staff/${stranger.users.admin.membershipId}/deactivate`)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
