/**
 * Development seed: SYNTHETIC data only. Every name, number and record below is invented.
 * Refuses to run in production. Run with `pnpm db:seed` (or `pnpm db:reset` to start clean).
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { localDate } from '@lumen/contracts';
import { PrismaClient, type Prisma, type Role } from '../src/generated/prisma/client';
import { PasswordService } from '../src/modules/identity/password.service';
import { nameKey } from '../src/modules/patients/patient.mapper';

export const DEMO_PASSWORD = 'LumenDemo!2026';

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data into a production environment.');
  process.exit(1);
}
if (!url) {
  console.error('MIGRATION_DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(1);
}

const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
// Inside `seed()` this is the transaction, so the demo data is written all-or-nothing: a failure part-way
// leaves an empty database that can simply be seeded again, never a half-seeded one.
let prisma: PrismaClient | Prisma.TransactionClient = client;
const passwords = new PasswordService();
const minutes = (n: number) => new Date(Date.now() + n * 60_000);

const PATIENTS: [string, string, string, 'FEMALE' | 'MALE', string, string][] = [
  ['Amina', 'Bello', '1991-04-12', 'FEMALE', 'Abuja', 'Wife'],
  ['Chinedu', 'Okeke', '1984-09-30', 'MALE', 'Enugu', 'Brother'],
  ['Funke', 'Adeyemi', '1976-01-22', 'FEMALE', 'Ibadan', 'Husband'],
  ['Ibrahim', 'Musa', '2003-11-05', 'MALE', 'Kano', 'Father'],
  ['Ngozi', 'Eze', '1988-07-18', 'FEMALE', 'Onitsha', 'Sister'],
  ['Tunde', 'Balogun', '1969-03-02', 'MALE', 'Lagos', 'Wife'],
  ['Zainab', 'Yusuf', '2015-08-14', 'FEMALE', 'Kaduna', 'Mother'],
  ['Emeka', 'Nwosu', '1995-12-09', 'MALE', 'Owerri', 'Mother'],
  ['Halima', 'Abdullahi', '1982-05-27', 'FEMALE', 'Sokoto', 'Husband'],
  ['Segun', 'Ogunleye', '1973-10-11', 'MALE', 'Abeokuta', 'Wife'],
  ['Blessing', 'Udoh', '1999-02-19', 'FEMALE', 'Uyo', 'Mother'],
  ['Kelechi', 'Obi', '1991-06-06', 'MALE', 'Awka', 'Sister'],
  ['Mariam', 'Danjuma', '2010-09-23', 'FEMALE', 'Jos', 'Father'],
  ['Oluwaseun', 'Adebayo', '1986-04-01', 'MALE', 'Lagos', 'Wife'],
  ['Chiamaka', 'Anyanwu', '1993-11-16', 'FEMALE', 'Enugu', 'Mother'],
  ['Yakubu', 'Garba', '1958-08-08', 'MALE', 'Zaria', 'Son'],
  ['Folasade', 'Ajayi', '1979-12-30', 'FEMALE', 'Ilorin', 'Husband'],
  ['Uche', 'Okonkwo', '2001-03-14', 'MALE', 'Nnewi', 'Father'],
  ['Hauwa', 'Lawal', '1990-07-21', 'FEMALE', 'Bauchi', 'Husband'],
  ['Damilola', 'Fashola', '1997-10-03', 'FEMALE', 'Lagos', 'Mother'],
  ['Chidi', 'Ibe', '1964-02-25', 'MALE', 'Aba', 'Wife'],
  ['Rakiya', 'Sani', '2018-05-30', 'FEMALE', 'Kano', 'Mother'],
  ['Adaeze', 'Nnamdi', '1985-01-09', 'FEMALE', 'Asaba', 'Husband'],
  ['Babatunde', 'Alade', '1971-06-17', 'MALE', 'Ibadan', 'Wife'],
  ['Ifeoma', 'Chukwu', '1994-09-04', 'FEMALE', 'Enugu', 'Brother'],
  ['Sule', 'Aminu', '1980-11-28', 'MALE', 'Maiduguri', 'Wife'],
  ['Temitope', 'Ojo', '2006-04-20', 'FEMALE', 'Lagos', 'Mother'],
  ['Victor', 'Etim', '1992-08-12', 'MALE', 'Calabar', 'Sister'],
  ['Hadiza', 'Bako', '1987-03-07', 'FEMALE', 'Minna', 'Husband'],
  ['Obinna', 'Agu', '1975-12-15', 'MALE', 'Abakaliki', 'Wife'],
];

async function user(email: string, fullName: string) {
  return prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash: await passwords.hash(DEMO_PASSWORD),
      passwordChangedAt: new Date(),
    },
  });
}

async function member(userId: string, organizationId: string, role: Role, branchIds: string[]) {
  return prisma.membership.create({
    data: {
      userId,
      organizationId,
      role,
      branches: { create: branchIds.map((branchId) => ({ branchId })) },
    },
  });
}

async function main() {
  if (await client.organization.findUnique({ where: { slug: 'lumen-general' } })) {
    console.log('Demo data already present. Run `pnpm db:reset` to start from a clean database.');
    return;
  }
  await client.$transaction(
    async (tx) => {
      prisma = tx;
      await seed();
    },
    { timeout: 300_000, maxWait: 30_000 },
  );
}

async function seed() {
  // ── Organisations ──────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: { name: 'Lumen General Hospital', slug: 'lumen-general', timezone: 'Africa/Lagos' },
  });
  const main = await prisma.branch.create({
    data: { organizationId: org.id, name: 'Main Campus', code: 'MAIN' },
  });
  const annex = await prisma.branch.create({
    data: { organizationId: org.id, name: 'Ikeja Annex', code: 'IKJ' },
  });
  const outpatient = await prisma.department.create({
    data: { organizationId: org.id, branchId: main.id, name: 'General Outpatient' },
  });
  await prisma.department.createMany({
    data: [
      { organizationId: org.id, branchId: main.id, name: 'Paediatrics' },
      { organizationId: org.id, branchId: main.id, name: 'Antenatal Clinic' },
      { organizationId: org.id, branchId: annex.id, name: 'General Outpatient' },
    ],
  });

  const other = await prisma.organization.create({
    data: { name: 'Harbour Clinic', slug: 'harbour-clinic', timezone: 'Africa/Lagos' },
  });
  const harbour = await prisma.branch.create({
    data: { organizationId: other.id, name: 'Harbour Road', code: 'HR' },
  });

  // ── People ─────────────────────────────────────────────────────────────────
  const admin = await user('admin@lumen.test', 'Adaobi Nwankwo');
  const okafor = await user('dr.okafor@lumen.test', 'Dr. Ifeanyi Okafor');
  const bello = await user('dr.bello@lumen.test', 'Dr. Salamatu Bello');
  const nurse = await user('nurse.adeyemi@lumen.test', 'Nurse Kehinde Adeyemi');
  const desk = await user('frontdesk@lumen.test', 'Chioma Eze');
  await member(admin.id, org.id, 'ORG_ADMIN', [main.id, annex.id]);
  await member(okafor.id, org.id, 'CLINICIAN', [main.id, annex.id]);
  await member(bello.id, org.id, 'CLINICIAN', [main.id]);
  await member(nurse.id, org.id, 'NURSE', [main.id]);
  await member(desk.id, org.id, 'FRONT_DESK', [main.id, annex.id]);

  const harbourAdmin = await user('admin@harbour.test', 'Tolu Marcus');
  const harbourDesk = await user('frontdesk@harbour.test', 'Grace Ikpe');
  await member(harbourAdmin.id, other.id, 'ORG_ADMIN', [harbour.id]);
  await member(harbourDesk.id, other.id, 'FRONT_DESK', [harbour.id]);
  // Dr. Okafor also works at Harbour Clinic: demonstrates switching organisations.
  await member(okafor.id, other.id, 'CLINICIAN', [harbour.id]);

  // ── Patients ───────────────────────────────────────────────────────────────
  let mrn = 0;
  const patients: Awaited<ReturnType<typeof prisma.patient.create>>[] = [];
  for (const [i, [given, family, dob, sex, city, relationship]] of PATIENTS.entries()) {
    mrn += 1;
    patients.push(
      await prisma.patient.create({
        data: {
          organizationId: org.id,
          mrn: `LH-${String(mrn).padStart(6, '0')}`,
          givenName: given,
          familyName: family,
          dateOfBirth: new Date(`${dob}T00:00:00Z`),
          sex,
          phone: `+2348030000${String(100 + i).padStart(3, '0')}`,
          city,
          state: city,
          nameKey: nameKey(given, family),
          registeredBranchId: main.id,
          createdById: desk.id,
          updatedById: desk.id,
          emergencyContacts: {
            create: [
              {
                name: `${relationship} of ${given}`,
                relationship,
                phone: `+2348030001${String(100 + i).padStart(3, '0')}`,
              },
            ],
          },
        },
      }),
    );
  }

  // A realistic registry volume (about 330 patients) so pagination, sorting and search have
  // something to work on. Names are combined deterministically from invented lists.
  const GIVEN = [
    'Adebola',
    'Chiamaka',
    'Emmanuel',
    'Fatima',
    'Gbenga',
    'Hauwa',
    'Ifeanyi',
    'Jumoke',
    'Kunle',
    'Lamide',
    'Musa',
    'Nkechi',
    'Olamide',
    'Peter',
    'Queen',
    'Rasheed',
    'Sade',
    'Tobi',
    'Uzoma',
    'Vivian',
    'Wale',
    'Yetunde',
    'Zaki',
    'Amara',
    'Bola',
    'Chidi',
    'Dayo',
    'Efe',
    'Folake',
    'Gift',
  ];
  const FAMILY = [
    'Adeleke',
    'Bankole',
    'Chukwu',
    'Danjuma',
    'Ekwueme',
    'Fagbemi',
    'Garba',
    'Hassan',
    'Ibekwe',
    'Jimoh',
    'Kalu',
    'Lawal',
    'Mohammed',
    'Nwachukwu',
    'Okafor',
    'Peters',
    'Quadri',
    'Rabiu',
    'Salisu',
    'Taiwo',
    'Umeh',
    'Value',
    'Wada',
    'Yakubu',
    'Zubair',
  ];
  const extra = [];
  for (let i = 0; i < 300; i += 1) {
    const givenName = GIVEN[i % GIVEN.length]!;
    const familyName = FAMILY[(i * 7 + Math.floor(i / GIVEN.length)) % FAMILY.length]!;
    mrn += 1;
    extra.push({
      organizationId: org.id,
      mrn: `LH-${String(mrn).padStart(6, '0')}`,
      givenName,
      familyName,
      dateOfBirth: new Date(Date.UTC(1940 + ((i * 11) % 75), (i * 5) % 12, 1 + ((i * 13) % 27))),
      sex: i % 2 === 0 ? ('FEMALE' as const) : ('MALE' as const),
      phone: `+23480310${String(10_000 + i)}`,
      city: ['Lagos', 'Abuja', 'Ibadan', 'Kano', 'Enugu', 'Port Harcourt'][i % 6]!,
      nameKey: nameKey(givenName, familyName),
      registeredBranchId: main.id,
      createdById: desk.id,
      updatedById: desk.id,
      createdAt: new Date(Date.now() - (300 - i) * 3_600_000 * 7),
    });
  }
  await prisma.patient.createMany({ data: extra });
  await prisma.counter.create({
    data: { organizationId: org.id, scope: 'patient-mrn', value: mrn },
  });

  for (const [i, [given, family, dob, sex]] of [
    ['Ada', 'Okorie', '1990-01-15', 'FEMALE'],
    ['Musa', 'Danladi', '1985-06-10', 'MALE'],
  ].entries() as IterableIterator<[number, [string, string, string, 'FEMALE' | 'MALE']]>) {
    await prisma.patient.create({
      data: {
        organizationId: other.id,
        mrn: `LH-${String(i + 1).padStart(6, '0')}`,
        givenName: given,
        familyName: family,
        dateOfBirth: new Date(`${dob}T00:00:00Z`),
        sex,
        phone: `+2348030009${String(i).padStart(3, '0')}`,
        nameKey: nameKey(given, family),
        registeredBranchId: harbour.id,
        createdById: harbourDesk.id,
        updatedById: harbourDesk.id,
      },
    });
  }
  await prisma.counter.create({
    data: { organizationId: other.id, scope: 'patient-mrn', value: 2 },
  });

  // ── Today's activity at Main Campus ────────────────────────────────────────
  let ticket = 0;
  const appt = (
    patientIndex: number,
    data: {
      status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED';
      type?: 'SCHEDULED' | 'WALK_IN';
      start: Date;
      checkedInAt?: Date;
      consultationStartedAt?: Date;
      completedAt?: Date;
      clinicianId?: string;
      reason: string;
      priority?: 'ROUTINE' | 'URGENT';
    },
  ) => {
    const checkedIn = data.status !== 'SCHEDULED';
    if (checkedIn) ticket += 1;
    return prisma.appointment.create({
      data: {
        organizationId: org.id,
        branchId: main.id,
        patientId: patients[patientIndex]!.id,
        departmentId: outpatient.id,
        clinicianId: data.clinicianId ?? null,
        type: data.type ?? 'SCHEDULED',
        status: data.status,
        priority: data.priority ?? 'ROUTINE',
        outcome: data.status === 'COMPLETED' ? 'SEEN' : null,
        scheduledStart: data.start,
        scheduledEnd: new Date(data.start.getTime() + 20 * 60_000),
        reason: data.reason,
        ticketNumber: checkedIn ? ticket : null,
        checkedInAt: data.checkedInAt ?? null,
        consultationStartedAt: data.consultationStartedAt ?? null,
        completedAt: data.completedAt ?? null,
        createdById: desk.id,
      },
    });
  };

  // Two finished consultations, documented and signed.
  const done = [
    {
      index: 0,
      reason: 'Persistent cough for two weeks',
      complaint: 'Dry cough for 14 days, worse at night.',
      assessment: 'Likely post-viral cough; chest clear on auscultation.',
      dx: ['Acute bronchitis', 'J20.9'],
      drug: ['Salbutamol inhaler', '100 mcg', 'INHALED', '2 puffs', 'twice daily', 7],
      vitals: {
        temperatureC: 36.8,
        heartRate: 82,
        systolicBp: 118,
        diastolicBp: 76,
        spo2: 98,
        weightKg: 64,
        heightCm: 165,
      },
      ago: 180,
    },
    {
      index: 1,
      reason: 'Headache and fever',
      complaint: 'Fever and headache for three days.',
      assessment: 'Febrile illness. Malaria rapid test positive.',
      dx: ['Uncomplicated malaria', 'B54'],
      drug: ['Artemether/lumefantrine', '20/120 mg', 'ORAL', '4 tablets', 'twice daily', 3],
      vitals: {
        temperatureC: 38.6,
        heartRate: 98,
        systolicBp: 122,
        diastolicBp: 80,
        spo2: 97,
        weightKg: 78,
        heightCm: 178,
      },
      ago: 100,
    },
  ] as const;

  for (const d of done) {
    const start = minutes(-d.ago - 30);
    const a = await appt(d.index, {
      status: 'COMPLETED',
      start,
      checkedInAt: minutes(-d.ago - 25),
      consultationStartedAt: minutes(-d.ago),
      completedAt: minutes(-d.ago + 15),
      clinicianId: okafor.id,
      reason: d.reason,
    });
    const enc = await prisma.encounter.create({
      data: {
        organizationId: org.id,
        branchId: main.id,
        patientId: a.patientId,
        appointmentId: a.id,
        attendingId: okafor.id,
        startedAt: minutes(-d.ago),
      },
    });
    await prisma.clinicalNote.create({
      data: {
        organizationId: org.id,
        encounterId: enc.id,
        patientId: a.patientId,
        chiefComplaint: d.complaint,
        assessment: d.assessment,
        plan: 'Treat as prescribed. Review if symptoms persist beyond one week.',
        updatedById: okafor.id,
      },
    });
    await prisma.vitalSigns.create({
      data: {
        organizationId: org.id,
        encounterId: enc.id,
        patientId: a.patientId,
        recordedById: nurse.id,
        ...d.vitals,
      },
    });
    await prisma.diagnosis.create({
      data: {
        organizationId: org.id,
        encounterId: enc.id,
        patientId: a.patientId,
        description: d.dx[0],
        icd10Code: d.dx[1],
        type: 'PRIMARY',
        certainty: 'CONFIRMED',
        recordedById: okafor.id,
      },
    });
    await prisma.medicationOrder.create({
      data: {
        organizationId: org.id,
        encounterId: enc.id,
        patientId: a.patientId,
        drugName: d.drug[0],
        strength: d.drug[1],
        route: d.drug[2],
        dose: d.drug[3],
        frequency: d.drug[4],
        durationDays: d.drug[5],
        status: 'ACTIVE',
        activatedAt: minutes(-d.ago + 14),
        prescribedById: okafor.id,
      },
    });
    await prisma.encounter.update({
      where: { id: enc.id },
      data: { status: 'FINALIZED', finalizedAt: minutes(-d.ago + 15), finalizedById: okafor.id },
    });
  }

  // One consultation in progress.
  const live = await appt(2, {
    status: 'IN_CONSULTATION',
    start: minutes(-40),
    checkedInAt: minutes(-35),
    consultationStartedAt: minutes(-12),
    clinicianId: bello.id,
    reason: 'Follow-up: blood pressure review',
  });
  const liveEnc = await prisma.encounter.create({
    data: {
      organizationId: org.id,
      branchId: main.id,
      patientId: live.patientId,
      appointmentId: live.id,
      attendingId: bello.id,
      startedAt: minutes(-12),
    },
  });
  await prisma.vitalSigns.create({
    data: {
      organizationId: org.id,
      encounterId: liveEnc.id,
      patientId: live.patientId,
      recordedById: nurse.id,
      systolicBp: 148,
      diastolicBp: 94,
      heartRate: 76,
      weightKg: 82,
      heightCm: 168,
    },
  });
  await prisma.clinicalNote.create({
    data: {
      organizationId: org.id,
      encounterId: liveEnc.id,
      patientId: live.patientId,
      chiefComplaint: 'Review of known hypertension. Reports occasional headaches.',
      updatedById: bello.id,
    },
  });

  // Waiting room.
  await appt(3, {
    status: 'CHECKED_IN',
    type: 'WALK_IN',
    start: minutes(-28),
    checkedInAt: minutes(-28),
    reason: 'Abdominal pain since morning',
    priority: 'URGENT',
  });
  await appt(4, {
    status: 'CHECKED_IN',
    start: minutes(-25),
    checkedInAt: minutes(-22),
    clinicianId: okafor.id,
    reason: 'Routine review',
  });
  await appt(5, {
    status: 'CHECKED_IN',
    type: 'WALK_IN',
    start: minutes(-9),
    checkedInAt: minutes(-9),
    reason: 'Back pain',
  });

  // Still to arrive.
  const slots: [number, number, string, string][] = [
    [6, 25, bello.id, 'Child immunisation review'],
    [7, 50, okafor.id, 'Medication refill'],
    [8, 80, okafor.id, 'Lab results discussion'],
    [9, 120, bello.id, 'Skin rash'],
  ];
  for (const [index, offset, clinicianId, reason] of slots) {
    await appt(index, { status: 'SCHEDULED', start: minutes(offset), clinicianId, reason });
  }

  await prisma.counter.create({
    data: {
      organizationId: org.id,
      scope: `queue:${main.id}:${localDate('Africa/Lagos')}`,
      value: ticket,
    },
  });

  console.log(`
Seeded synthetic demo data.

  Organisation  Lumen General Hospital (+ Harbour Clinic for tenant-isolation checks)
  Password      ${DEMO_PASSWORD}   (development only)

  admin@lumen.test            Administrator
  dr.okafor@lumen.test        Clinician (also a member of Harbour Clinic)
  dr.bello@lumen.test         Clinician
  nurse.adeyemi@lumen.test    Nurse
  frontdesk@lumen.test        Front desk
  admin@harbour.test          Administrator, Harbour Clinic
`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.$disconnect());
