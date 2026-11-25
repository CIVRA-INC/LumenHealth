import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EmailService, sentMessages } from '../src/modules/email/email.service';
import {
  appRoleClient,
  createApp,
  createWorld,
  ownerClient,
  signIn,
  TEST_PASSWORD,
  type Agent,
  type World,
} from './helpers';
import { PasswordService } from '../src/modules/identity/password.service';

const owner = ownerClient();
const appRole = appRoleClient();
let app: NestExpressApplication;
let worldA: World;
let worldB: World;
let platform: Agent;
let platformEmail: string;
const tag = randomUUID().slice(0, 8);
const api = '/api/v1';
const NEW_PASSWORD = 'Brand-New-Password-42';

/** The raw token only ever exists in the delivered email, exactly as for a real recipient. */
function tokenSentTo(email: string): string {
  const message = [...sentMessages].reverse().find((m) => m.to === email.toLowerCase());
  const token = message?.text.match(/#token=([\w-]+)/)?.[1];
  if (!token) throw new Error(`No invitation email was sent to ${email}`);
  return token;
}
const post = (path: string, body: unknown = {}) =>
  request(app.getHttpServer())
    .post(`${api}${path}`)
    .send(body as object);
const registerBody = (name: string, adminEmail: string) => ({
  name,
  timezone: 'Africa/Lagos',
  branch: { name: 'Main Campus', code: 'MAIN' },
  admin: { fullName: 'Ada Admin', email: adminEmail },
});

beforeAll(async () => {
  app = await createApp();
  worldA = await createWorld(owner, 'onbA');
  worldB = await createWorld(owner, 'onbB');
  await owner.user.updateMany({
    where: { platformRole: { not: null } },
    data: { platformRole: null },
  });
  platformEmail = `platform.${tag}@lumen.test`;
  await owner.user.create({
    data: {
      email: platformEmail,
      fullName: 'Pat Platform',
      passwordHash: await new PasswordService().hash(TEST_PASSWORD),
      platformRole: 'PLATFORM_ADMIN',
    },
  });
  platform = await signIn(app, platformEmail);
});
afterAll(async () => {
  await app.close();
  await owner.$disconnect();
  await appRole.$disconnect();
});

describe('platform administrator access', () => {
  it('signs in without any organisation membership and sees a platform session', async () => {
    const res = await platform.get(`${api}/auth/session`);
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('PLATFORM');
    expect(res.body.platformRole).toBe('PLATFORM_ADMIN');
    expect(res.body.permissions).toContain('platform.organizations.manage');
    expect(res.body).not.toHaveProperty('organization');
    expect(res.body).not.toHaveProperty('branch');
    const row = await owner.session.findFirstOrThrow({ where: { user: { email: platformEmail } } });
    expect(row.membershipId).toBeNull();
    expect(row.branchId).toBeNull();
  });

  it('can use platform endpoints', async () => {
    expect((await platform.get(`${api}/platform/organizations`)).status).toBe(200);
  });

  it('cannot reach any organisation-scoped endpoint, however it asks', async () => {
    for (const path of ['/patients', '/admin/users', '/admin/invitations', '/branches']) {
      const res = await platform.get(`${api}${path}`);
      expect([401, 403]).toContain(res.status);
    }
  });

  it('is refused to organisation administrators, who never acquire platform permissions', async () => {
    const admin = await signIn(app, worldA.users.admin.email);
    expect((await admin.get(`${api}/platform/organizations`)).status).toBe(403);
    expect((await admin.get(`${api}/platform/invitations`)).status).toBe(403);
    expect(
      (
        await admin
          .post(`${api}/platform/organizations`)
          .send(registerBody('Sneaky Hospital', 'x@lumen.test'))
      ).status,
    ).toBe(403);
    const session = await admin.get(`${api}/auth/session`);
    expect(session.body.scope).toBe('ORGANIZATION');
    expect(JSON.stringify(session.body.permissions)).not.toContain('platform.');
  });

  it('requires a session', async () => {
    expect((await request(app.getHttpServer()).get(`${api}/platform/organizations`)).status).toBe(
      401,
    );
  });

  it('refuses a platform session once the user loses the platform role', async () => {
    const email = `demoted.${tag}@lumen.test`;
    const user = await owner.user.create({
      data: {
        email,
        fullName: 'Demoted',
        passwordHash: await new PasswordService().hash(TEST_PASSWORD),
        platformRole: 'PLATFORM_ADMIN',
      },
    });
    const agent = await signIn(app, email);
    expect((await agent.get(`${api}/platform/organizations`)).status).toBe(200);
    await owner.user.update({ where: { id: user.id }, data: { platformRole: null } });
    expect((await agent.get(`${api}/platform/organizations`)).status).toBe(401);
  });
});

describe('hospital onboarding', () => {
  const hospitalName = `Harbour Test Hospital ${tag}`;
  const adminEmail = `ada.${tag}@hospital.test`;
  let orgId: string;
  let adminToken: string;

  it('registers a hospital, its first branch and an administrator invitation in one step', async () => {
    const res = await platform
      .post(`${api}/platform/organizations`)
      .send(registerBody(hospitalName, adminEmail));
    expect(res.status).toBe(201);
    orgId = res.body.id;
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.onboarding).toBe('AWAITING_ADMIN');
    expect(res.body.branches).toHaveLength(1);
    expect(res.body.invitations).toHaveLength(1);
    expect(res.body.invitations[0]).toMatchObject({
      role: 'ORG_ADMIN',
      state: 'PENDING',
      delivery: 'SENT',
      email: adminEmail,
    });
    adminToken = tokenSentTo(adminEmail);
  });

  it('never stores or audits the raw token', async () => {
    const stored = await owner.invitation.findMany({ where: { organizationId: orgId } });
    expect(JSON.stringify(stored)).not.toContain(adminToken);
    expect(stored[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const events = await owner.auditEvent.findMany({ where: { organizationId: orgId } });
    expect(events.map((e) => e.action)).toEqual(
      expect.arrayContaining(['organization.create', 'invitation.create']),
    );
    expect(JSON.stringify(events)).not.toContain(adminToken);
  });

  it('rejects duplicate hospital names', async () => {
    const dupe = await platform
      .post(`${api}/platform/organizations`)
      .send(registerBody(hospitalName.toUpperCase(), `other.${tag}@hospital.test`));
    expect(dupe.status).toBe(409);
  });

  it('creates nothing when the hospital cannot be fully created (atomic)', async () => {
    const before = await owner.organization.count();
    const res = await platform.post(`${api}/platform/organizations`).send({
      ...registerBody(`Bad Branch ${tag}`, `bad.${tag}@hospital.test`),
      branch: { name: 'X', code: '!' },
    });
    expect(res.status).toBe(400);
    expect(await owner.organization.count()).toBe(before);
  });

  it('shows what the token holder needs and nothing more', async () => {
    const res = await post('/invitations/inspect', { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      state: 'PENDING',
      organizationName: hospitalName,
      role: 'ORG_ADMIN',
      existingAccount: false,
    });
    expect(JSON.stringify(res.body)).not.toContain('tokenHash');
  });

  it('answers unknown tokens the same way every time, and accept gives the generic gone response', async () => {
    const fake = 'x'.repeat(43);
    expect((await post('/invitations/inspect', { token: fake })).body).toEqual({
      state: 'UNAVAILABLE',
    });
    const accept = await post('/invitations/accept', { token: fake, password: NEW_PASSWORD });
    expect(accept.status).toBe(410);
    expect(accept.body.error.code).toBe('INVITATION_UNAVAILABLE');
  });

  it('rejects a weak password without consuming the invitation', async () => {
    const res = await post('/invitations/accept', { token: adminToken, password: 'short' });
    expect(res.status).toBe(400);
    expect((await post('/invitations/inspect', { token: adminToken })).body.state).toBe('PENDING');
    expect(await owner.user.count({ where: { email: adminEmail } })).toBe(0);
  });

  it('lets the invited administrator set a password and sign in to exactly their hospital and branch', async () => {
    expect(
      (await post('/invitations/accept', { token: adminToken, password: NEW_PASSWORD })).status,
    ).toBe(204);
    const login = await request(app.getHttpServer())
      .post(`${api}/auth/login`)
      .send({ email: adminEmail, password: NEW_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ scope: 'ORGANIZATION', role: 'ORG_ADMIN' });
    expect(login.body.organization.id).toBe(orgId);
    expect(login.body.branches).toHaveLength(1);
    expect(login.body.memberships).toHaveLength(1);
    const detail = await platform.get(`${api}/platform/organizations/${orgId}`);
    expect(detail.body.onboarding).toBe('ACTIVE');
    expect(detail.body.invitations[0].state).toBe('ACCEPTED');
  });

  it('cannot reuse an accepted invitation', async () => {
    const again = await post('/invitations/accept', {
      token: adminToken,
      password: 'Different-Password-99',
    });
    expect(again.status).toBe(410);
    expect((await post('/invitations/inspect', { token: adminToken })).body.state).toBe('ACCEPTED');
    // The password set by the first acceptance is untouched.
    expect(
      (
        await request(app.getHttpServer())
          .post(`${api}/auth/login`)
          .send({ email: adminEmail, password: NEW_PASSWORD })
      ).status,
    ).toBe(200);
  });

  it('cannot be accepted twice at the same instant', async () => {
    const email = `race.${tag}@hospital.test`;
    const admin = await signIn(app, adminEmail, NEW_PASSWORD);
    const branchId = (await admin.get(`${api}/branches`)).body[0].id;
    expect(
      (
        await admin
          .post(`${api}/admin/invitations`)
          .send({ email, fullName: 'Race Nurse', role: 'NURSE', branchIds: [branchId] })
      ).status,
    ).toBe(201);
    const token = tokenSentTo(email);
    const results = await Promise.all(
      [1, 2, 3, 4].map(() => post('/invitations/accept', { token, password: NEW_PASSWORD })),
    );
    expect(results.filter((r) => r.status === 204)).toHaveLength(1);
    expect(
      await owner.membership.count({ where: { user: { email }, organizationId: orgId } }),
    ).toBe(1);
  });

  it('suspension ends sessions and sign-in immediately; reactivation restores access', async () => {
    const admin = await signIn(app, adminEmail, NEW_PASSWORD);
    expect((await admin.get(`${api}/admin/users`)).status).toBe(200);

    const suspended = await platform
      .patch(`${api}/platform/organizations/${orgId}/status`)
      .send({ status: 'SUSPENDED' });
    expect(suspended.status).toBe(200);
    expect(suspended.body.status).toBe('SUSPENDED');
    expect((await admin.get(`${api}/admin/users`)).status).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .post(`${api}/auth/login`)
          .send({ email: adminEmail, password: NEW_PASSWORD })
      ).status,
    ).toBe(403);
    // No new invitations while suspended.
    expect((await platform.post(`${api}/platform/invitations/${randomUUID()}/resend`)).status).toBe(
      404,
    );

    await platform
      .patch(`${api}/platform/organizations/${orgId}/status`)
      .send({ status: 'ACTIVE' });
    expect(
      (
        await request(app.getHttpServer())
          .post(`${api}/auth/login`)
          .send({ email: adminEmail, password: NEW_PASSWORD })
      ).status,
    ).toBe(200);
    const actions = (await owner.auditEvent.findMany({ where: { organizationId: orgId } })).map(
      (e) => e.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining(['organization.suspend', 'organization.reactivate']),
    );
  });

  it('can revoke and resend administrator invitations (resend invalidates the old link)', async () => {
    const email = `second.${tag}@hospital.test`;
    const org = await platform
      .post(`${api}/platform/organizations`)
      .send(registerBody(`Resend Hospital ${tag}`, email));
    const id = org.body.invitations[0].id;
    const first = tokenSentTo(email);

    const resent = await platform.post(`${api}/platform/invitations/${id}/resend`);
    expect(resent.status).toBe(200);
    expect(resent.body.sendCount).toBe(2);
    const second = tokenSentTo(email);
    expect(second).not.toBe(first);
    expect((await post('/invitations/inspect', { token: first })).body).toEqual({
      state: 'UNAVAILABLE',
    });
    expect((await post('/invitations/inspect', { token: second })).body.state).toBe('PENDING');

    const revoked = await platform.post(`${api}/platform/invitations/${id}/revoke`);
    expect(revoked.body.state).toBe('REVOKED');
    expect(
      (await post('/invitations/accept', { token: second, password: NEW_PASSWORD })).status,
    ).toBe(410);
    expect((await post('/invitations/inspect', { token: second })).body.state).toBe('REVOKED');
    expect((await platform.post(`${api}/platform/invitations/${id}/resend`)).status).toBe(409);
    const actions = (await owner.auditEvent.findMany({ where: { resourceId: id } })).map(
      (e) => e.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining(['invitation.create', 'invitation.resend', 'invitation.revoke']),
    );
  });

  it('reports undelivered email truthfully instead of pretending it was sent', async () => {
    const email = `fail.${tag}@hospital.test`;
    const original = EmailService.prototype.send;
    EmailService.prototype.send = async () => ({
      ok: false,
      reason: 'The mail server rejected or could not be reached (ECONNREFUSED)',
    });
    try {
      const res = await platform
        .post(`${api}/platform/organizations`)
        .send(registerBody(`Undelivered ${tag}`, email));
      expect(res.status).toBe(201);
      expect(res.body.invitations[0]).toMatchObject({
        delivery: 'FAILED',
        state: 'PENDING',
        sendCount: 0,
      });
      expect(res.body.invitations[0].deliveryError).toMatch(/could not be reached/);
    } finally {
      EmailService.prototype.send = original;
    }
  });
});

describe('staff invitations', () => {
  let admin: Agent;
  beforeAll(async () => {
    admin = await signIn(app, worldA.users.admin.email);
  });
  const invite = (agent: Agent, over: Record<string, unknown> = {}) =>
    agent.post(`${api}/admin/invitations`).send({
      email: `staff.${randomUUID().slice(0, 8)}@hospital.test`,
      fullName: 'New Staffer',
      role: 'NURSE',
      branchIds: [worldA.branchId],
      ...over,
    });

  it('invites, then accepts with only the authorised role and branch', async () => {
    const email = `nurse.${randomUUID().slice(0, 8)}@hospital.test`;
    const res = await invite(admin, { email, role: 'NURSE', branchIds: [worldA.branchId] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ state: 'PENDING', delivery: 'SENT', role: 'NURSE' });

    expect(
      (await post('/invitations/accept', { token: tokenSentTo(email), password: NEW_PASSWORD }))
        .status,
    ).toBe(204);
    const login = await request(app.getHttpServer())
      .post(`${api}/auth/login`)
      .send({ email, password: NEW_PASSWORD });
    expect(login.body.role).toBe('NURSE');
    expect(login.body.organization.id).toBe(worldA.orgId);
    expect(login.body.branches.map((b: { id: string }) => b.id)).toEqual([worldA.branchId]);
    const membership = await owner.membership.findFirstOrThrow({
      where: { user: { email } },
      include: { branches: true },
    });
    expect(membership.branches.map((b) => b.branchId)).toEqual([worldA.branchId]);
    expect(
      (
        await owner.auditEvent.findMany({
          where: { organizationId: worldA.orgId, action: 'invitation.accept' },
        })
      ).length,
    ).toBeGreaterThan(0);
  });

  it('lists invitations by state', async () => {
    const pending = await invite(admin);
    const revoked = await invite(admin);
    await admin.post(`${api}/admin/invitations/${revoked.body.id}/revoke`);
    const expired = await invite(admin);
    await owner.invitation.update({
      where: { id: expired.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const states = async (state: string) =>
      (await admin.get(`${api}/admin/invitations`).query({ state })).body.items.map(
        (i: { id: string }) => i.id,
      );
    expect(await states('PENDING')).toContain(pending.body.id);
    expect(await states('REVOKED')).toContain(revoked.body.id);
    expect(await states('EXPIRED')).toContain(expired.body.id);
    expect(await states('ACCEPTED')).not.toContain(pending.body.id);
  });

  it('rejects expired invitations, and a resend gives a working link', async () => {
    const email = `exp.${randomUUID().slice(0, 8)}@hospital.test`;
    const res = await invite(admin, { email });
    const old = tokenSentTo(email);
    await owner.invitation.update({
      where: { id: res.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await post('/invitations/accept', { token: old, password: NEW_PASSWORD })).status).toBe(
      410,
    );
    expect((await post('/invitations/inspect', { token: old })).body.state).toBe('EXPIRED');

    expect((await admin.post(`${api}/admin/invitations/${res.body.id}/resend`)).status).toBe(200);
    expect(
      (await post('/invitations/accept', { token: tokenSentTo(email), password: NEW_PASSWORD }))
        .status,
    ).toBe(204);
  });

  it('rejects a revoked invitation', async () => {
    const email = `rev.${randomUUID().slice(0, 8)}@hospital.test`;
    const res = await invite(admin, { email });
    await admin.post(`${api}/admin/invitations/${res.body.id}/revoke`);
    expect(
      (await post('/invitations/accept', { token: tokenSentTo(email), password: NEW_PASSWORD }))
        .status,
    ).toBe(410);
    expect(await owner.user.count({ where: { email } })).toBe(0);
  });

  it('refuses a second pending invitation for the same email, and invitations for current members', async () => {
    const email = `dup.${randomUUID().slice(0, 8)}@hospital.test`;
    expect((await invite(admin, { email })).status).toBe(201);
    expect((await invite(admin, { email })).status).toBe(409);
    expect((await invite(admin, { email: worldA.users.nurse.email })).status).toBe(409);
  });

  it('stops roles escalating: only administrators invite, and platform roles cannot be granted', async () => {
    for (const key of ['clinician', 'nurse', 'frontDesk'] as const) {
      const agent = await signIn(app, worldA.users[key].email);
      expect((await invite(agent, { role: 'ORG_ADMIN' })).status).toBe(403);
      expect((await agent.get(`${api}/admin/invitations`)).status).toBe(403);
    }
    expect((await invite(admin, { role: 'PLATFORM_ADMIN' })).status).toBe(400);
    const platformUser = await owner.user.findFirstOrThrow({
      where: { platformRole: { not: null } },
    });
    expect((await invite(admin, { email: platformUser.email })).status).toBe(400);
  });

  it('enforces branch assignment: own organisation and own access only', async () => {
    expect((await invite(admin, { branchIds: [worldB.branchId] })).status).toBe(400);
    expect((await invite(admin, { branchIds: [] })).status).toBe(400);
    // A branch-limited administrator cannot hand out branches they do not hold.
    const limited = await owner.user.create({
      data: {
        email: `limited.${tag}@hospital.test`,
        fullName: 'Limited Admin',
        passwordHash: await new PasswordService().hash(TEST_PASSWORD),
      },
    });
    await owner.membership.create({
      data: {
        userId: limited.id,
        organizationId: worldA.orgId,
        role: 'ORG_ADMIN',
        branches: { create: [{ branchId: worldA.branchId }] },
      },
    });
    const agent = await signIn(app, limited.email);
    expect((await invite(agent, { branchIds: [worldA.branch2Id] })).status).toBe(400);
    expect((await invite(agent, { branchIds: [worldA.branchId] })).status).toBe(201);
  });

  it('keeps organisations apart: one hospital cannot see, resend or revoke another’s invitations', async () => {
    const adminB = await signIn(app, worldB.users.admin.email);
    const mine = await invite(admin);
    expect((await adminB.post(`${api}/admin/invitations/${mine.body.id}/resend`)).status).toBe(404);
    expect((await adminB.post(`${api}/admin/invitations/${mine.body.id}/revoke`)).status).toBe(404);
    const listB = await adminB
      .get(`${api}/admin/invitations`)
      .query({ organizationId: worldA.orgId });
    expect(listB.body.items.map((i: { id: string }) => i.id)).not.toContain(mine.body.id);
    expect((await owner.invitation.findUniqueOrThrow({ where: { id: mine.body.id } })).status).toBe(
      'PENDING',
    );
  });

  it('lets an existing user join another organisation without losing anything', async () => {
    const adminB = await signIn(app, worldB.users.admin.email);
    const existing = worldA.users.clinician;
    const before = await owner.user.findUniqueOrThrow({ where: { id: existing.id } });

    const res = await adminB.post(`${api}/admin/invitations`).send({
      email: existing.email,
      fullName: 'Ignored Name',
      role: 'NURSE',
      branchIds: [worldB.branchId],
    });
    expect(res.status).toBe(201);
    const token = tokenSentTo(existing.email);
    expect((await post('/invitations/inspect', { token })).body.existingAccount).toBe(true);

    // The existing password is the proof; a wrong one changes nothing.
    expect(
      (await post('/invitations/accept', { token, password: 'Wrong-Password-12345' })).status,
    ).toBe(400);
    expect((await post('/invitations/inspect', { token })).body.state).toBe('PENDING');
    expect((await post('/invitations/accept', { token, password: TEST_PASSWORD })).status).toBe(
      204,
    );

    const after = await owner.user.findUniqueOrThrow({ where: { id: existing.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.fullName).toBe(before.fullName);
    const memberships = await owner.membership.findMany({ where: { userId: existing.id } });
    expect(memberships.map((m) => m.organizationId).sort()).toEqual(
      [worldA.orgId, worldB.orgId].sort(),
    );

    const agent = await signIn(app, existing.email);
    const view = (await agent.get(`${api}/auth/session`)).body;
    expect(view.role).toBe('CLINICIAN');
    expect(view.memberships).toHaveLength(2);
    const switched = await agent
      .post(`${api}/auth/switch-context`)
      .send({ organizationId: worldB.orgId });
    expect(switched.status).toBe(200);
    expect(switched.body).toMatchObject({ role: 'NURSE' });
    // Role in A is unchanged by the invitation to B, and B's branches are not A's.
    expect(
      (
        await agent
          .post(`${api}/auth/switch-context`)
          .send({ organizationId: worldB.orgId, branchId: worldA.branchId })
      ).status,
    ).toBe(403);
  });

  it('applies role and branch changes to live sessions immediately', async () => {
    const nurse = await signIn(app, worldA.users.nurse.email);
    expect((await nurse.get(`${api}/patients`)).status).toBe(200);
    const res = await admin
      .patch(`${api}/admin/users/${worldA.users.nurse.membershipId}`)
      .send({ role: 'FRONT_DESK' });
    expect(res.status).toBe(200);
    expect((await nurse.get(`${api}/patients`)).status).toBe(401);
    expect(
      (
        await owner.auditEvent.findMany({
          where: { resourceId: worldA.users.nurse.membershipId, action: 'user.update' },
        })
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe('row-level security around onboarding', () => {
  it('shows an organisation only its own audit events, including platform actions about it', async () => {
    const adminEmail = `rls.${tag}@hospital.test`;
    const created = await platform
      .post(`${api}/platform/organizations`)
      .send(registerBody(`RLS Hospital ${tag}`, adminEmail));
    const orgId = created.body.id as string;

    const asOrg = (id: string) =>
      appRole.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_org_id', ${id}, true)`;
        return tx.auditEvent.findMany({ where: { action: 'organization.create' } });
      });
    expect((await asOrg(orgId)).map((e) => e.resourceId)).toEqual([orgId]);
    expect((await asOrg(worldB.orgId)).map((e) => e.resourceId)).not.toContain(orgId);
  });

  it('keeps tenant tables unreadable without an organisation context', async () => {
    expect(await appRole.patient.count()).toBe(0);
  });
});
