import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createApp,
  createWorld,
  newPatientBody,
  ownerClient,
  registerPatient,
  signIn,
  type Agent,
  type World,
} from './helpers';

const owner = ownerClient();
let app: NestExpressApplication;
let world: World;
let desk: Agent;
let admin: Agent;

beforeAll(async () => {
  app = await createApp();
  world = await createWorld(owner, 'patients');
  desk = await signIn(app, world.users.frontDesk.email);
  admin = await signIn(app, world.users.admin.email);
});
afterAll(async () => {
  await app.close();
  await owner.$disconnect();
});

describe('patient registry', () => {
  it('registers a patient with a stable MRN, normalised phone and emergency contact', async () => {
    const res = await desk.post('/api/v1/patients').send(
      newPatientBody({
        givenName: 'Amina',
        familyName: 'Bello-Registry',
        phone: '0803 123 4567',
        identifiers: [{ type: 'NATIONAL_ID', value: '123 456 789 01' }],
        emergencyContacts: [{ name: 'Yusuf Bello', relationship: 'Husband', phone: '08031230000' }],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.mrn).toMatch(/^LH-\d{6}$/);
    expect(res.body.phone).toBe('+2348031234567');
    expect(res.body.identifiers[0].value).toBe('12345678901');
    expect(res.body.emergencyContacts).toHaveLength(1);
    expect(res.body.id).not.toBe(res.body.mrn);

    const fetched = await desk.get(`/api/v1/patients/${res.body.id}`);
    expect(fetched.body.mrn).toBe(res.body.mrn);
  });

  it('validates input on the server', async () => {
    const res = await desk
      .post('/api/v1/patients')
      .send({ givenName: '', dateOfBirth: '2999-01-01', phone: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    const fields = res.body.error.details.fields.map((f: { path: string }) => f.path);
    expect(fields).toEqual(
      expect.arrayContaining(['givenName', 'dateOfBirth', 'phone', 'familyName']),
    );
  });

  it('issues unique, gap-free MRNs under concurrent registration', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => desk.post('/api/v1/patients').send(newPatientBody())),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    const numbers = results.map((r) => Number(r.body.mrn.slice(3))).sort((x, y) => x - y);
    expect(new Set(numbers).size).toBe(8);
    expect(numbers[7]! - numbers[0]!).toBe(7);
  });

  it('warns about a likely duplicate and only proceeds when the registrar confirms', async () => {
    const original = await registerPatient(desk, {
      givenName: 'Ọlá',
      familyName: 'Bánjo',
      dateOfBirth: '1980-02-02',
    });
    // Same person, written without diacritics and with different case.
    const attempt = newPatientBody({
      givenName: 'ola',
      familyName: 'BANJO',
      dateOfBirth: '1980-02-02',
    });
    const blocked = await desk.post('/api/v1/patients').send(attempt);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('POTENTIAL_DUPLICATE_PATIENT');
    expect(blocked.body.error.details.candidates[0].id).toBe(original.id);
    expect(blocked.body.error.details.candidates[0].reasons).toContain('SAME_NAME_AND_DOB');

    const confirmed = await desk
      .post('/api/v1/patients')
      .send({ ...attempt, confirmNotDuplicate: true });
    expect(confirmed.status).toBe(201);
  });

  it('never allows the same national ID to be registered twice', async () => {
    const first = newPatientBody({ identifiers: [{ type: 'PASSPORT', value: 'A12345678' }] });
    expect((await desk.post('/api/v1/patients').send(first)).status).toBe(201);
    const second = newPatientBody({
      identifiers: [{ type: 'PASSPORT', value: 'a1234 5678' }],
      confirmNotDuplicate: true,
    });
    const res = await desk.post('/api/v1/patients').send(second);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_IDENTIFIER');
  });

  it('finds patients by name, MRN and phone', async () => {
    const p = await registerPatient(desk, {
      givenName: 'Searchable',
      familyName: 'Findme',
      phone: '08099887766',
    });
    for (const q of ['findme', 'Searchable Findme', p.mrn.toLowerCase(), '08099887766', '887766']) {
      const res = await desk.get('/api/v1/patients').query({ q });
      expect(res.status).toBe(200);
      expect(res.body.items.map((i: { id: string }) => i.id)).toContain(p.id);
    }
    const none = await desk.get('/api/v1/patients').query({ q: 'zzzznotaperson' });
    expect(none.body.total).toBe(0);
  });

  it('sorts by name or by most recent registration', async () => {
    const first = await registerPatient(desk, { givenName: 'Sorta', familyName: 'Zzzlast' });
    const second = await registerPatient(desk, { givenName: 'Sortb', familyName: 'Aaafirst' });
    const byName = await desk
      .get('/api/v1/patients')
      .query({ q: 'Sort', sort: 'name', order: 'asc' });
    const names: string[] = byName.body.items.map((p: { familyName: string }) => p.familyName);
    expect(names.indexOf('Aaafirst')).toBeLessThan(names.indexOf('Zzzlast'));
    const recent = await desk
      .get('/api/v1/patients')
      .query({ sort: 'registered', order: 'desc', pageSize: 5 });
    const ids: string[] = recent.body.items.map((p: { id: string }) => p.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    expect((await desk.get('/api/v1/patients').query({ sort: 'bogus' })).status).toBe(400);
  });

  it('rejects stale updates with a version conflict', async () => {
    const p = await registerPatient(desk);
    const ok = await desk
      .patch(`/api/v1/patients/${p.id}`)
      .send({ version: p.version, phone: '08011112222' });
    expect(ok.status).toBe(200);
    expect(ok.body.version).toBe(p.version + 1);
    expect(ok.body.phone).toBe('+2348011112222');

    const stale = await desk
      .patch(`/api/v1/patients/${p.id}`)
      .send({ version: p.version, phone: '08033334444' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_VERSION');
  });

  it('replaces emergency contacts on update', async () => {
    const p = await registerPatient(desk, {
      emergencyContacts: [{ name: 'Old Contact', relationship: 'Friend', phone: '08000000001' }],
    });
    const res = await desk.patch(`/api/v1/patients/${p.id}`).send({
      version: p.version,
      emergencyContacts: [{ name: 'New Contact', relationship: 'Sister', phone: '08000000002' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.emergencyContacts).toHaveLength(1);
    expect(res.body.emergencyContacts[0].name).toBe('New Contact');
  });

  it('audits reads and writes without recording demographic values', async () => {
    const p = await registerPatient(desk, { givenName: 'Auditable', familyName: 'Person' });
    await desk.get(`/api/v1/patients/${p.id}`);
    await desk.patch(`/api/v1/patients/${p.id}`).send({ version: p.version, givenName: 'Renamed' });
    const events = await admin.get('/api/v1/audit-events').query({ patientId: p.id });
    const actions = events.body.items.map((e: { action: string }) => e.action);
    expect(actions).toEqual(
      expect.arrayContaining(['patient.create', 'patient.read', 'patient.update']),
    );
    expect(JSON.stringify(events.body)).not.toContain('Renamed');
    const row = await owner.auditEvent.findFirst({
      where: { patientId: p.id, action: 'patient.update' },
    });
    expect(row?.metadata).toEqual({ fields: ['givenName'] });
  });
});
