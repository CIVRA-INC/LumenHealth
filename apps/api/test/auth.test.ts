import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp, createWorld, ownerClient, signIn, TEST_PASSWORD, type World } from './helpers';

const owner = ownerClient();
let app: NestExpressApplication;
let world: World;

beforeAll(async () => {
  app = await createApp();
  world = await createWorld(owner, 'auth');
});
afterAll(async () => {
  await app.close();
  await owner.$disconnect();
});

describe('authentication', () => {
  it('signs in and sets an HttpOnly, SameSite session cookie that never appears in the body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: world.users.clinician.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    const cookie = String(res.headers['set-cookie']?.[0]);
    expect(cookie).toMatch(/^lh_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(JSON.stringify(res.body)).not.toContain(cookie.split(';')[0]!.split('=')[1]);
    expect(res.body.role).toBe('CLINICIAN');
    expect(res.body.permissions).toContain('encounters.finalize');
    expect(res.body).not.toHaveProperty('user.passwordHash');
  });

  it('gives the same generic error for an unknown account and a wrong password', async () => {
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@lumen.test', password: 'whatever-password' });
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: world.users.nurse.email, password: 'definitely-wrong-1' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/patients');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('invalidates the session on logout', async () => {
    const agent = await signIn(app, world.users.admin.email);
    expect((await agent.get('/api/v1/auth/session')).status).toBe(200);
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/v1/auth/session')).status).toBe(401);
  });

  it('locks the account after repeated failures, even for the right password', async () => {
    const email = world.users.frontDesk.email;
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong-password-1' });
      expect(res.status).toBe(401);
    }
    const locked = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('stops honouring a session when the user is disabled', async () => {
    const agent = await signIn(app, world.users.nurse.email);
    await owner.user.update({ where: { id: world.users.nurse.id }, data: { status: 'DISABLED' } });
    expect((await agent.get('/api/v1/auth/session')).status).toBe(401);
    await owner.user.update({ where: { id: world.users.nurse.id }, data: { status: 'ACTIVE' } });
  });

  it('expires idle sessions', async () => {
    const agent = await signIn(app, world.users.clinician2.email);
    await owner.session.updateMany({
      where: { userId: world.users.clinician2.id },
      data: { lastSeenAt: new Date(Date.now() - 3 * 3_600_000) },
    });
    expect((await agent.get('/api/v1/auth/session')).status).toBe(401);
  });

  it('forces a temporary password to be changed before anything else works', async () => {
    await owner.user.update({
      where: { id: world.users.admin.id },
      data: { mustChangePassword: true },
    });
    const agent = await signIn(app, world.users.admin.email);
    const blocked = await agent.get('/api/v1/admin/users');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await agent.get('/api/v1/auth/session')).status).toBe(200);

    const weak = await agent
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'short' });
    expect(weak.status).toBe(400);

    const changed = await agent
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'A-Brand-New-Passphrase-1' });
    expect(changed.status).toBe(204);
    expect((await agent.get('/api/v1/admin/users')).status).toBe(200);

    // The old password no longer works.
    const old = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: world.users.admin.email, password: TEST_PASSWORD });
    expect(old.status).toBe(401);
  });

  it('rejects state-changing requests from a foreign origin', async () => {
    const agent = await signIn(app, world.users.clinician.email);
    const res = await agent
      .post('/api/v1/auth/switch-context')
      .set('Origin', 'https://evil.example')
      .send({});
    expect(res.status).toBe(403);
    const ok = await agent
      .post('/api/v1/auth/switch-context')
      .set('Origin', 'http://localhost:5173')
      .send({});
    expect(ok.status).toBe(200);
  });

  it('lets a user switch only to branches they are assigned to', async () => {
    const agent = await signIn(app, world.users.nurse.email);
    const denied = await agent
      .post('/api/v1/auth/switch-context')
      .send({ branchId: world.branch2Id });
    expect(denied.status).toBe(403);
  });
});
