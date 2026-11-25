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
let desk: Agent;
let nurse: Agent;
let doctor: Agent;
let doctor2: Agent;
let admin: Agent;

const inMinutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString();

beforeAll(async () => {
  app = await createApp();
  world = await createWorld(owner, 'flow');
  desk = await signIn(app, world.users.frontDesk.email);
  nurse = await signIn(app, world.users.nurse.email);
  doctor = await signIn(app, world.users.clinician.email);
  doctor2 = await signIn(app, world.users.clinician2.email);
  admin = await signIn(app, world.users.admin.email);
});
afterAll(async () => {
  await app.close();
  await owner.$disconnect();
});

async function checkedInVisit(reason = 'Consultation') {
  const patient = await registerPatient(desk);
  const walkIn = await desk.post('/api/v1/queue/walk-ins').send({ patientId: patient.id, reason });
  expect(walkIn.status).toBe(201);
  return { patient, appointmentId: walkIn.body.id as string };
}

async function openEncounter(agent = doctor) {
  const { patient, appointmentId } = await checkedInVisit();
  const res = await agent
    .post('/api/v1/encounters')
    .send({ appointmentId, expectedPatientId: patient.id });
  expect(res.status).toBe(201);
  return { patient, appointmentId, id: res.body.id as string };
}

describe('scheduling and queue', () => {
  it('books, checks in, and numbers the queue; blocks invalid transitions', async () => {
    const patient = await registerPatient(desk);
    const created = await desk.post('/api/v1/appointments').send({
      patientId: patient.id,
      scheduledStart: inMinutes(30),
      durationMinutes: 20,
      reason: 'Review',
      clinicianId: world.users.clinician.id,
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('SCHEDULED');
    const id = created.body.id as string;

    const checkedIn = await desk.post(`/api/v1/appointments/${id}/check-in`);
    expect(checkedIn.status).toBe(200);
    expect(checkedIn.body.status).toBe('CHECKED_IN');
    expect(checkedIn.body.ticketNumber).toBeGreaterThan(0);

    const again = await desk.post(`/api/v1/appointments/${id}/check-in`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATE_TRANSITION');

    expect((await desk.post(`/api/v1/appointments/${id}/no-show`)).status).toBe(409);
    const cancelled = await desk
      .post(`/api/v1/appointments/${id}/cancel`)
      .send({ outcome: 'LEFT_WITHOUT_BEING_SEEN' });
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(cancelled.body.outcome).toBe('LEFT_WITHOUT_BEING_SEEN');
    expect((await desk.post(`/api/v1/appointments/${id}/check-in`)).status).toBe(409);
  });

  it('rejects past bookings and clinician double-booking', async () => {
    const p1 = await registerPatient(desk);
    const p2 = await registerPatient(desk);
    const past = await desk
      .post('/api/v1/appointments')
      .send({ patientId: p1.id, scheduledStart: inMinutes(-600) });
    expect(past.status).toBe(400);

    const start = inMinutes(300);
    const body = {
      scheduledStart: start,
      durationMinutes: 30,
      clinicianId: world.users.clinician.id,
    };
    expect(
      (await desk.post('/api/v1/appointments').send({ ...body, patientId: p1.id })).status,
    ).toBe(201);
    const clash = await desk.post('/api/v1/appointments').send({ ...body, patientId: p2.id });
    expect(clash.status).toBe(409);
    expect(clash.body.error.message).toMatch(/clinician already has/i);
    // The same patient cannot be double-booked either.
    const dup = await desk
      .post('/api/v1/appointments')
      .send({ patientId: p1.id, scheduledStart: start, durationMinutes: 30 });
    expect(dup.status).toBe(409);
  });

  it('does not let a patient sit in the queue twice', async () => {
    const { patient } = await checkedInVisit();
    const second = await desk
      .post('/api/v1/queue/walk-ins')
      .send({ patientId: patient.id, reason: 'Again' });
    expect(second.status).toBe(409);
  });

  it('steers walk-ins with a booking today toward check-in', async () => {
    const patient = await registerPatient(desk);
    const booked = await desk
      .post('/api/v1/appointments')
      .send({ patientId: patient.id, scheduledStart: inMinutes(120) });
    expect(booked.status).toBe(201);
    const walkIn = await desk
      .post('/api/v1/queue/walk-ins')
      .send({ patientId: patient.id, reason: 'Early' });
    expect(walkIn.status).toBe(409);
    expect(walkIn.body.error.details.appointmentId).toBe(booked.body.id);
  });

  it('orders the waiting list urgent-first, then by arrival', async () => {
    const routine1 = await checkedInVisit('Routine one');
    const urgentPatient = await registerPatient(desk);
    const urgent = await desk
      .post('/api/v1/queue/walk-ins')
      .send({ patientId: urgentPatient.id, reason: 'Chest pain', priority: 'URGENT' });
    const routine2 = await checkedInVisit('Routine two');

    const queue = await nurse.get('/api/v1/queue');
    expect(queue.status).toBe(200);
    const ids: string[] = queue.body.waiting.map((a: { id: string }) => a.id);
    expect(ids.indexOf(urgent.body.id)).toBeLessThan(ids.indexOf(routine1.appointmentId));
    expect(ids.indexOf(routine1.appointmentId)).toBeLessThan(ids.indexOf(routine2.appointmentId));
  });
});

describe('outpatient encounter lifecycle', () => {
  it('runs the full journey: start → vitals → note → diagnosis → prescription → sign → close', async () => {
    const { patient, appointmentId, id } = await openEncounter();

    const appt = await desk.get(`/api/v1/appointments/${appointmentId}`);
    expect(appt.body.status).toBe('IN_CONSULTATION');
    expect(appt.body.encounterId).toBe(id);

    const vitals = await nurse.post(`/api/v1/encounters/${id}/vitals`).send({
      temperatureC: 38.4,
      heartRate: 96,
      systolicBp: 128,
      diastolicBp: 82,
      spo2: 97,
      weightKg: 70,
      heightCm: 175,
    });
    expect(vitals.status).toBe(201);
    expect(vitals.body.vitals[0].bmi).toBe(22.9);

    const note = await doctor.put(`/api/v1/encounters/${id}/note`).send({
      chiefComplaint: 'Fever and headache for 3 days',
      assessment: 'Febrile illness',
      plan: 'Antimalarials; review in 3 days',
    });
    expect(note.status).toBe(200);

    // Incomplete documentation cannot be signed.
    const early = await doctor.post(`/api/v1/encounters/${id}/finalize`).send({ confirm: true });
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('DOCUMENTATION_INCOMPLETE');

    const dx = await doctor.post(`/api/v1/encounters/${id}/diagnoses`).send({
      description: 'Uncomplicated malaria',
      icd10Code: 'b54',
      type: 'PRIMARY',
      certainty: 'CONFIRMED',
    });
    expect(dx.status).toBe(201);
    expect(dx.body.diagnoses[0].icd10Code).toBe('B54');
    const secondPrimary = await doctor
      .post(`/api/v1/encounters/${id}/diagnoses`)
      .send({ description: 'Another', type: 'PRIMARY' });
    expect(secondPrimary.status).toBe(409);

    const order = await doctor.post(`/api/v1/encounters/${id}/medication-orders`).send({
      drugName: 'Artemether/lumefantrine',
      strength: '20/120 mg',
      dose: '4 tablets',
      frequency: 'twice daily',
      durationDays: 3,
    });
    expect(order.status).toBe(201);
    expect(order.body.medicationOrders[0].status).toBe('DRAFT');

    // Signing requires explicit confirmation.
    expect((await doctor.post(`/api/v1/encounters/${id}/finalize`).send({})).status).toBe(400);
    const signed = await doctor.post(`/api/v1/encounters/${id}/finalize`).send({ confirm: true });
    expect(signed.status).toBe(200);
    expect(signed.body.status).toBe('FINALIZED');
    expect(signed.body.editable).toBe(false);
    expect(signed.body.medicationOrders[0].status).toBe('ACTIVE');
    expect(signed.body.finalizedBy.userId).toBe(world.users.clinician.id);

    expect((await desk.get(`/api/v1/appointments/${appointmentId}`)).body.status).toBe('COMPLETED');

    // Closing needs a disposition; draft→closed is not a valid shortcut, signed→closed is.
    const closed = await doctor
      .post(`/api/v1/encounters/${id}/close`)
      .send({ disposition: 'DISCHARGED_HOME', dischargeInstructions: 'Rest and fluids.' });
    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe('CLOSED');
    expect(
      (await doctor.post(`/api/v1/encounters/${id}/close`).send({ disposition: 'DISCHARGED_HOME' }))
        .status,
    ).toBe(409);

    const history = await doctor.get(`/api/v1/patients/${patient.id}/encounters`);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].primaryDiagnosis).toBe('Uncomplicated malaria');
  });

  it('locks signed documentation and offers addenda for corrections', async () => {
    const { id } = await openEncounter();
    await doctor.put(`/api/v1/encounters/${id}/note`).send({ chiefComplaint: 'Cough' });
    await doctor
      .post(`/api/v1/encounters/${id}/diagnoses`)
      .send({ description: 'Bronchitis', type: 'PRIMARY' });
    await doctor
      .post(`/api/v1/encounters/${id}/medication-orders`)
      .send({ drugName: 'Amoxicillin', dose: '500 mg', frequency: 'three times daily' });
    expect(
      (await doctor.post(`/api/v1/encounters/${id}/finalize`).send({ confirm: true })).status,
    ).toBe(200);

    for (const res of [
      await doctor
        .put(`/api/v1/encounters/${id}/note`)
        .send({ chiefComplaint: 'Edited after signing' }),
      await nurse.post(`/api/v1/encounters/${id}/vitals`).send({ heartRate: 70 }),
      await doctor
        .post(`/api/v1/encounters/${id}/diagnoses`)
        .send({ description: 'Late addition' }),
      await doctor
        .post(`/api/v1/encounters/${id}/medication-orders`)
        .send({ drugName: 'Late', dose: '1', frequency: 'daily' }),
      await doctor
        .post(`/api/v1/encounters/${id}/void`)
        .send({ reason: 'Trying to undo a signed note' }),
    ]) {
      expect(res.status).toBe(409);
    }

    const addendum = await doctor2
      .post(`/api/v1/encounters/${id}/addenda`)
      .send({ text: 'Allergy to penicillin reported after consult.' });
    expect(addendum.status).toBe(201);
    expect(addendum.body.addenda).toHaveLength(1);
    expect(addendum.body.note.chiefComplaint).toBe('Cough');

    const detail = await doctor.get(`/api/v1/encounters/${id}`);
    const orderId = detail.body.medicationOrders[0].id as string;
    const cancelled = await doctor
      .post(`/api/v1/encounters/${id}/medication-orders/${orderId}/cancel`)
      .send({ reason: 'Penicillin allergy' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.medicationOrders[0].status).toBe('CANCELLED');
  });

  it('refuses addenda on drafts and edits by a clinician who is not the attending', async () => {
    const { id } = await openEncounter();
    expect(
      (await doctor.post(`/api/v1/encounters/${id}/addenda`).send({ text: 'Too early to correct' }))
        .status,
    ).toBe(409);
    const intruder = await doctor2
      .put(`/api/v1/encounters/${id}/note`)
      .send({ chiefComplaint: 'Not my patient' });
    expect(intruder.status).toBe(403);
    expect(
      (await doctor2.post(`/api/v1/encounters/${id}/finalize`).send({ confirm: true })).status,
    ).toBe(403);
  });

  it('refuses to open an encounter for the wrong patient', async () => {
    const { appointmentId } = await checkedInVisit();
    const someoneElse = await registerPatient(desk);
    const res = await doctor
      .post('/api/v1/encounters')
      .send({ appointmentId, expectedPatientId: someoneElse.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PATIENT_MISMATCH');
    // Nothing was started.
    expect((await desk.get(`/api/v1/appointments/${appointmentId}`)).body.status).toBe(
      'CHECKED_IN',
    );
    const denied = await admin.get('/api/v1/audit-events').query({ action: 'encounter.start' });
    expect(denied.body.items.some((e: { outcome: string }) => e.outcome === 'DENIED')).toBe(true);
  });

  it('lets only one clinician take a waiting patient', async () => {
    const { patient, appointmentId } = await checkedInVisit();
    const body = { appointmentId, expectedPatientId: patient.id };
    const [r1, r2] = await Promise.all([
      doctor.post('/api/v1/encounters').send(body),
      doctor2.post('/api/v1/encounters').send(body),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
  });

  it('voids a draft encounter and puts the patient back in the queue', async () => {
    const { appointmentId, id, patient } = await openEncounter();
    const res = await doctor
      .post(`/api/v1/encounters/${id}/void`)
      .send({ reason: 'Opened against wrong chart' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ENTERED_IN_ERROR');
    expect((await desk.get(`/api/v1/appointments/${appointmentId}`)).body.status).toBe(
      'CHECKED_IN',
    );
    const history = await doctor.get(`/api/v1/patients/${patient.id}/encounters`);
    expect(history.body).toHaveLength(0);
    // The patient can be seen again.
    expect(
      (
        await doctor
          .post('/api/v1/encounters')
          .send({ appointmentId, expectedPatientId: patient.id })
      ).status,
    ).toBe(201);
  });

  it('validates clinical input', async () => {
    const { id } = await openEncounter();
    expect((await nurse.post(`/api/v1/encounters/${id}/vitals`).send({})).status).toBe(400);
    expect(
      (
        await nurse
          .post(`/api/v1/encounters/${id}/vitals`)
          .send({ systolicBp: 80, diastolicBp: 120 })
      ).status,
    ).toBe(400);
    expect(
      (await nurse.post(`/api/v1/encounters/${id}/vitals`).send({ temperatureC: 70 })).status,
    ).toBe(400);
    expect(
      (
        await doctor
          .post(`/api/v1/encounters/${id}/diagnoses`)
          .send({ description: 'x', icd10Code: 'nonsense' })
      ).status,
    ).toBe(400);
  });

  it('marks vitals entered in error without deleting them', async () => {
    const { id } = await openEncounter();
    const rec = await nurse.post(`/api/v1/encounters/${id}/vitals`).send({ heartRate: 250 });
    const vitalsId = rec.body.vitals[0].id as string;
    const res = await nurse
      .post(`/api/v1/encounters/${id}/vitals/${vitalsId}/void`)
      .send({ reason: 'Wrong patient' });
    expect(res.status).toBe(200);
    expect(res.body.vitals[0].enteredInError).toBe(true);
  });
});

describe('database invariants protect the record even if application code is bypassed', () => {
  it('blocks edits to a signed encounter’s documentation at the database', async () => {
    const { id } = await openEncounter();
    await doctor.put(`/api/v1/encounters/${id}/note`).send({ chiefComplaint: 'Original' });
    await doctor
      .post(`/api/v1/encounters/${id}/diagnoses`)
      .send({ description: 'Dx', type: 'PRIMARY' });
    await doctor.post(`/api/v1/encounters/${id}/finalize`).send({ confirm: true });
    await expect(
      owner.$executeRaw`UPDATE clinical_notes SET "chiefComplaint" = 'Tampered' WHERE "encounterId" = ${id}::uuid`,
    ).rejects.toThrow(/locked/i);
    await expect(
      owner.$executeRaw`DELETE FROM diagnoses WHERE "encounterId" = ${id}::uuid`,
    ).rejects.toThrow(/locked/i);
  });

  it('blocks invalid state jumps at the database', async () => {
    const { id } = await openEncounter();
    await expect(
      owner.$executeRaw`UPDATE encounters SET status = 'CLOSED', "closedAt" = now(), disposition = 'DISCHARGED_HOME', "finalizedAt" = now(), "finalizedById" = ${world.users.clinician.id}::uuid WHERE id = ${id}::uuid`,
    ).rejects.toThrow(/transition/i);
  });

  it('rejects clinical rows that point at another patient’s encounter', async () => {
    const { id } = await openEncounter();
    const other = await registerPatient(desk);
    await expect(
      owner.clinicalNote.create({
        data: {
          organizationId: world.orgId,
          encounterId: id,
          patientId: other.id,
          updatedById: world.users.clinician.id,
          chiefComplaint: 'Wrong patient',
        },
      }),
    ).rejects.toThrow();
  });
});

describe('dashboard', () => {
  it('reports figures derived from actual records for the current branch', async () => {
    const before = await doctor.get('/api/v1/dashboard');
    expect(before.status).toBe(200);
    const w0 = before.body.counts.waiting as number;

    await checkedInVisit();
    const after = await doctor.get('/api/v1/dashboard');
    expect(after.body.counts.waiting).toBe(w0 + 1);

    const live = await owner.appointment.count({
      where: { organizationId: world.orgId, branchId: world.branchId, status: 'CHECKED_IN' },
    });
    expect(after.body.counts.waiting).toBe(live);
    const ongoing = await owner.encounter.count({
      where: { organizationId: world.orgId, branchId: world.branchId, status: 'IN_PROGRESS' },
    });
    expect(after.body.counts.inConsultation).toBe(ongoing);
    expect(after.body.queue.length).toBeLessThanOrEqual(8);
  });

  it('is scoped to the branch the user is working in', async () => {
    const annexDoctor = await signIn(app, world.users.clinician.email);
    const switched = await annexDoctor
      .post('/api/v1/auth/switch-context')
      .send({ branchId: world.branch2Id });
    expect(switched.status).toBe(200);
    const res = await annexDoctor.get('/api/v1/dashboard');
    expect(res.body.branch.id).toBe(world.branch2Id);
    expect(res.body.counts.waiting).toBe(0);
  });
});
