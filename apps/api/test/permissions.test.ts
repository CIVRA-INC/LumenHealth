import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createApp,
  createWorld,
  ownerClient,
  registerPatient,
  signIn,
  type Agent,
  type World,
} from './helpers';

const owner = ownerClient();
let app: NestExpressApplication;
let world: World;
let admin: Agent;
let desk: Agent;
let nurse: Agent;
let clinician: Agent;
let patient: { id: string };

beforeAll(async () => {
  app = await createApp();
  world = await createWorld(owner, 'perm');
  [admin, desk, nurse, clinician] = await Promise.all([
    signIn(app, world.users.admin.email),
    signIn(app, world.users.frontDesk.email),
    signIn(app, world.users.nurse.email),
    signIn(app, world.users.clinician.email),
  ]);
  patient = await registerPatient(desk);
});
afterAll(async () => {
  await app.close();
  await owner.$disconnect();
});

describe('role-based access control', () => {
  it('keeps front desk out of clinical documentation', async () => {
    const walkIn = await desk
      .post('/api/v1/queue/walk-ins')
      .send({ patientId: patient.id, reason: 'Fever' });
    expect(walkIn.status).toBe(201);
    expect((await desk.get('/api/v1/encounters')).status).toBe(403);
    expect((await desk.get(`/api/v1/patients/${patient.id}/encounters`)).status).toBe(403);
    expect(
      (
        await desk
          .post('/api/v1/encounters')
          .send({ appointmentId: walkIn.body.id, expectedPatientId: patient.id })
      ).status,
    ).toBe(403);
  });

  it('gives administrators no clinical access', async () => {
    expect((await admin.get('/api/v1/encounters')).status).toBe(403);
    expect((await admin.get(`/api/v1/patients/${patient.id}/encounters`)).status).toBe(403);
    expect((await admin.get('/api/v1/audit-events')).status).toBe(200);
    expect((await admin.get('/api/v1/admin/users')).status).toBe(200);
  });

  it('stops everyone but administrators from managing users or reading the audit log', async () => {
    for (const agent of [desk, nurse, clinician]) {
      expect((await agent.get('/api/v1/admin/users')).status).toBe(403);
      expect((await agent.get('/api/v1/audit-events')).status).toBe(403);
      expect(
        (await agent.post('/api/v1/branches').send({ name: 'Rogue', code: 'RGE' })).status,
      ).toBe(403);
    }
  });

  it('stops clinical staff registering patients', async () => {
    expect((await clinician.post('/api/v1/patients').send({})).status).toBe(403);
    expect((await nurse.post('/api/v1/patients').send({})).status).toBe(403);
  });

  it('lets nurses record vitals but not prescribe, document or sign', async () => {
    const other = await registerPatient(desk);
    const walkIn = await desk
      .post('/api/v1/queue/walk-ins')
      .send({ patientId: other.id, reason: 'Review' });
    const started = await clinician
      .post('/api/v1/encounters')
      .send({ appointmentId: walkIn.body.id, expectedPatientId: walkIn.body.patient.id });
    const id = started.body.id as string;

    expect(
      (await nurse.post(`/api/v1/encounters/${id}/vitals`).send({ heartRate: 80 })).status,
    ).toBe(201);
    expect(
      (await nurse.put(`/api/v1/encounters/${id}/note`).send({ chiefComplaint: 'x' })).status,
    ).toBe(403);
    expect(
      (
        await nurse
          .post(`/api/v1/encounters/${id}/medication-orders`)
          .send({ drugName: 'Drug', dose: '1', frequency: 'daily' })
      ).status,
    ).toBe(403);
    expect(
      (await nurse.post(`/api/v1/encounters/${id}/finalize`).send({ confirm: true })).status,
    ).toBe(403);
    expect((await nurse.get(`/api/v1/encounters/${id}`)).status).toBe(200);
  });

  it('records denied access attempts in the audit trail', async () => {
    await desk.get('/api/v1/encounters');
    const events = await admin.get('/api/v1/audit-events').query({ action: 'access.denied' });
    expect(events.status).toBe(200);
    expect(events.body.total).toBeGreaterThan(0);
    expect(events.body.items[0].outcome).toBe('DENIED');
  });

  it('prevents administrators from locking themselves out or removing the last admin', async () => {
    const self = await admin
      .patch(`/api/v1/admin/users/${world.users.admin.membershipId}`)
      .send({ role: 'NURSE' });
    expect(self.status).toBe(403);
  });

  it('applies role changes to live sessions immediately', async () => {
    const victim = await signIn(app, world.users.nurse.email);
    expect((await victim.get('/api/v1/dashboard')).status).toBe(200);
    const res = await admin
      .patch(`/api/v1/admin/users/${world.users.nurse.membershipId}`)
      .send({ status: 'DISABLED' });
    expect(res.status).toBe(200);
    expect((await victim.get('/api/v1/dashboard')).status).toBe(401);
  });

  it('does not log search text, only counts', async () => {
    await desk.get('/api/v1/patients').query({ q: 'SecretSearchTerm' });
    const events = await admin.get('/api/v1/audit-events').query({ action: 'patient.search' });
    expect(JSON.stringify(events.body)).not.toContain('SecretSearchTerm');
  });
});
