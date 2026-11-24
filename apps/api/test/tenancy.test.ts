import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  appRoleClient,
  createApp,
  createWorld,
  fixturePatient,
  ownerClient,
  registerPatient,
  signIn,
  type Agent,
  type World,
} from './helpers';

const owner = ownerClient();
const appRole = appRoleClient();
let app: NestExpressApplication;
let a: World;
let b: World;
let deskA: Agent;
let deskB: Agent;
let clinicianB: Agent;
let patientA: { id: string; mrn: string; version: number };

beforeAll(async () => {
  app = await createApp();
  a = await createWorld(owner, 'tenant-a');
  b = await createWorld(owner, 'tenant-b');
  deskA = await signIn(app, a.users.frontDesk.email);
  deskB = await signIn(app, b.users.frontDesk.email);
  clinicianB = await signIn(app, b.users.clinician.email);
  patientA = await registerPatient(deskA, { givenName: 'Zuri', familyName: 'Isolation' });
});
afterAll(async () => {
  await app.close();
  await owner.$disconnect();
  await appRole.$disconnect();
});

describe('API tenant isolation', () => {
  it("does not reveal another organisation's patient by id (404, not 403)", async () => {
    const res = await deskB.get(`/api/v1/patients/${patientA.id}`);
    expect(res.status).toBe(404);
  });

  it('refuses to update another organisation’s patient', async () => {
    const res = await deskB
      .patch(`/api/v1/patients/${patientA.id}`)
      .send({ version: patientA.version, givenName: 'Hijacked' });
    expect(res.status).toBe(404);
    const after = await deskA.get(`/api/v1/patients/${patientA.id}`);
    expect(after.body.givenName).toBe('Zuri');
  });

  it('excludes other organisations from search results', async () => {
    const res = await deskB.get('/api/v1/patients').query({ q: 'Isolation' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    const own = await deskA.get('/api/v1/patients').query({ q: 'Isolation' });
    expect(own.body.total).toBe(1);
  });

  it('cannot schedule a visit for, or open the encounter of, another organisation’s patient', async () => {
    const appt = await deskB
      .post('/api/v1/queue/walk-ins')
      .send({ patientId: patientA.id, reason: 'Cross-tenant attempt' });
    expect(appt.status).toBe(404);

    // Build a real encounter in tenant A, then try to reach it from tenant B.
    const clinicianA = await signIn(app, a.users.clinician.email);
    const walkIn = await deskA
      .post('/api/v1/queue/walk-ins')
      .send({ patientId: patientA.id, reason: 'Check' });
    const started = await clinicianA
      .post('/api/v1/encounters')
      .send({ appointmentId: walkIn.body.id, expectedPatientId: patientA.id });
    expect(started.status).toBe(201);
    const encounterId = started.body.id as string;

    expect((await clinicianB.get(`/api/v1/encounters/${encounterId}`)).status).toBe(404);
    expect(
      (await clinicianB.put(`/api/v1/encounters/${encounterId}/note`).send({ chiefComplaint: 'x' }))
        .status,
    ).toBe(404);
    expect((await clinicianB.get(`/api/v1/patients/${patientA.id}/encounters`)).status).toBe(404);
    expect(
      (
        await clinicianB
          .post('/api/v1/encounters')
          .send({ appointmentId: walkIn.body.id, expectedPatientId: patientA.id })
      ).status,
    ).toBe(404);
  });

  it('only lists staff of the caller’s own organisation', async () => {
    const adminB = await signIn(app, b.users.admin.email);
    const res = await adminB.get('/api/v1/admin/users');
    expect(res.status).toBe(200);
    const emails: string[] = res.body.items.map((u: { email: string }) => u.email);
    expect(emails).toContain(b.users.clinician.email);
    expect(emails).not.toContain(a.users.clinician.email);
  });

  it('cannot assign a user to a branch of another organisation', async () => {
    const adminB = await signIn(app, b.users.admin.email);
    const res = await adminB.post('/api/v1/admin/users').send({
      email: `intruder.${Date.now()}@lumen.test`,
      fullName: 'Intruder',
      role: 'CLINICIAN',
      branchIds: [a.branchId],
      temporaryPassword: 'Temporary-Passphrase-1',
    });
    expect(res.status).toBe(400);
  });

  it('keeps audit events scoped to the organisation', async () => {
    const adminB = await signIn(app, b.users.admin.email);
    const res = await adminB.get('/api/v1/audit-events').query({ patientId: patientA.id });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});

describe('database row-level security (defense in depth)', () => {
  it('shows no tenant rows when no organisation context is set', async () => {
    await fixturePatient(owner, a);
    const rows = await appRole.patient.findMany();
    expect(rows).toHaveLength(0);
  });

  it('shows only the current organisation’s rows even if a query forgets its tenant filter', async () => {
    await fixturePatient(owner, b);
    const seenByB = await appRole.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_org_id', ${b.orgId}, true)`;
      return tx.patient.findMany(); // deliberately no organizationId filter
    });
    expect(seenByB.length).toBeGreaterThan(0);
    expect(seenByB.every((p) => p.organizationId === b.orgId)).toBe(true);
  });

  it('rejects writes into another organisation’s tenant', async () => {
    await expect(
      appRole.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_org_id', ${b.orgId}, true)`;
        await tx.patient.create({
          data: {
            organizationId: a.orgId,
            mrn: 'X-1',
            givenName: 'Cross',
            familyName: 'Tenant',
            dateOfBirth: new Date('1990-01-01'),
            sex: 'MALE',
            phone: '+2348000000000',
            nameKey: 'tenant|cross',
            registeredBranchId: a.branchId,
            createdById: a.users.admin.id,
            updatedById: a.users.admin.id,
          },
        });
      }),
    ).rejects.toThrow();
  });

  it('rejects links between rows of different organisations via composite foreign keys', async () => {
    const pa = await fixturePatient(owner, a);
    await expect(
      owner.appointment.create({
        data: {
          organizationId: b.orgId, // org B...
          branchId: b.branchId,
          patientId: pa.id, // ...pointing at org A's patient
          type: 'WALK_IN',
          scheduledStart: new Date(),
          scheduledEnd: new Date(Date.now() + 60_000),
          createdById: b.users.admin.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('keeps the audit trail append-only for the application role', async () => {
    await expect(appRole.auditEvent.deleteMany()).rejects.toThrow();
    await expect(appRole.auditEvent.updateMany({ data: { action: 'tampered' } })).rejects.toThrow();
  });

  it('keeps the audit trail append-only even for the schema owner (trigger)', async () => {
    const sample = await owner.auditEvent.findFirst({ where: { organizationId: a.orgId } });
    expect(sample).not.toBeNull();
    await expect(
      owner.auditEvent.update({ where: { id: sample!.id }, data: { action: 'tampered' } }),
    ).rejects.toThrow();
    await expect(owner.auditEvent.delete({ where: { id: sample!.id } })).rejects.toThrow();
  });
});
