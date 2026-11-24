/* eslint-disable no-console */
/**
 * Visual review helper: signs in as each role and captures key screens at desktop, laptop and
 * mobile sizes into ./screenshots (git-ignored). Needs the app running (BASE_URL, default
 * http://localhost:5174) with the demo seed.
 *
 *   node scripts/screenshots.mjs [screenName ...]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:5174';
const PASSWORD = 'LumenDemo!2026';
const sizes = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};

// [name, role email, path, optional prepare(page) -> path]
const screens = [
  ['login', null, '/login'],
  ['dashboard-frontdesk', 'frontdesk@lumen.test', '/'],
  ['dashboard-clinician', 'dr.bello@lumen.test', '/'],
  ['dashboard-admin', 'admin@lumen.test', '/'],
  ['patients', 'frontdesk@lumen.test', '/patients'],
  ['patients-search', 'frontdesk@lumen.test', '/patients?q=a'],
  ['patient-register', 'frontdesk@lumen.test', '/patients/new'],
  ['schedule', 'frontdesk@lumen.test', '/schedule'],
  ['consultations', 'dr.bello@lumen.test', '/consultations'],
  [
    'encounter',
    'dr.bello@lumen.test',
    '/consultations',
    async (page) => {
      const res = await page.request.get('/api/v1/encounters?status=IN_PROGRESS&mine=true');
      const { items } = await res.json();
      return `/encounters/${items[0].id}`;
    },
  ],
  [
    'encounter-long',
    'dr.okafor@lumen.test',
    '/consultations',
    async (page) => {
      const res = await page.request.get('/api/v1/encounters?status=IN_PROGRESS&mine=true');
      const { items } = await res.json();
      return `/encounters/${items[0].id}`;
    },
  ],
  [
    'encounter-signed',
    'dr.okafor@lumen.test',
    '/consultations',
    async (page) => {
      const res = await page.request.get('/api/v1/encounters?status=FINALIZED');
      const { items } = await res.json();
      return `/encounters/${items[0].id}`;
    },
  ],
  [
    'patient-detail',
    'frontdesk@lumen.test',
    '/patients',
    async (page) => {
      const res = await page.request.get('/api/v1/patients?pageSize=1');
      const { items } = await res.json();
      return `/patients/${items[0].id}`;
    },
  ],
  ['staff', 'admin@lumen.test', '/admin/users'],
  ['audit', 'admin@lumen.test', '/admin/audit'],
  ['account', 'dr.okafor@lumen.test', '/account'],
  ['design-system', 'admin@lumen.test', '/design-system'],
];

/**
 * A deliberately difficult record: a very long name, a long urgent reason and a long clinical note.
 * Adversarial fixtures like this belong only in the disposable visual-review database, so they are created
 * only when `pnpm shots` (scripts/visual-stack.mjs) sets SHOTS_FIXTURES=1 for its own freshly seeded stack.
 * Run against any other server, the script just photographs what is there.
 */
async function ensureStressRecord(browser) {
  const ctxs = {};
  for (const email of ['frontdesk@lumen.test', 'dr.okafor@lumen.test']) {
    ctxs[email] = await browser.newContext({ baseURL: base });
    const r = await ctxs[email].request.post('/api/v1/auth/login', {
      data: { email, password: PASSWORD },
    });
    if (!r.ok()) throw new Error(`login failed for ${email}: ${r.status()}`);
  }
  const desk = ctxs['frontdesk@lumen.test'].request;
  const doc = ctxs['dr.okafor@lumen.test'].request;
  const existing = await (await doc.get('/api/v1/encounters?status=IN_PROGRESS&mine=true')).json();
  if (existing.items?.some((e) => e.patient.displayName.startsWith('Oluwadamilare'))) return;
  const patient = await (
    await desk.post('/api/v1/patients', {
      data: {
        givenName: 'Oluwadamilare-Maximiliana',
        middleName: 'Chukwuemeka',
        familyName: 'Adebayo-Nwachukwu-Okonkwo',
        dateOfBirth: '1962-11-30',
        sex: 'MALE',
        phone: '08031234567',
        emergencyContacts: [
          {
            name: 'Her Royal Highness Adaobi Nwachukwu-Adebayo',
            relationship: 'Spouse',
            phone: '08031230000',
          },
        ],
      },
    })
  ).json();
  const walkIn = await (
    await desk.post('/api/v1/queue/walk-ins', {
      data: {
        patientId: patient.id,
        priority: 'URGENT',
        reason:
          'Progressive shortness of breath on exertion over three weeks with intermittent chest tightness, worse at night, with a background of poorly controlled type 2 diabetes',
      },
    })
  ).json();
  const enc = await (
    await doc.post('/api/v1/encounters', {
      data: { appointmentId: walkIn.id, expectedPatientId: patient.id },
    })
  ).json();
  await doc.put(`/api/v1/encounters/${enc.id}/note`, {
    data: {
      chiefComplaint: 'Shortness of breath on exertion for three weeks',
      history:
        'Three-week history of progressive exertional dyspnoea, now breathless after one flight of stairs (previously three). Associated intermittent central chest tightness lasting five to ten minutes, not clearly pleuritic, worse lying flat, relieved by sitting upright. Two-pillow orthopnoea; one episode of paroxysmal nocturnal dyspnoea last week. Ankle swelling for ten days. No fever, haemoptysis or calf pain. Known type 2 diabetes for twelve years on metformin and gliclazide with HbA1c 9.4% three months ago; hypertension on amlodipine, poor adherence reported. Non-smoker. Father died of myocardial infarction at 58.',
      examination:
        'Alert, mildly tachypnoeic at rest. JVP raised 4 cm. Bibasal crackles to mid-zones. Pitting oedema to mid-shin bilaterally. Heart sounds dual, soft apical systolic murmur.',
    },
  });
  await doc.post(`/api/v1/encounters/${enc.id}/vitals`, {
    data: {
      heartRate: 112,
      respiratoryRate: 24,
      systolicBp: 164,
      diastolicBp: 98,
      spo2: 93,
      temperatureC: 37.1,
      weightKg: 96.5,
      heightCm: 172,
    },
  });
  await doc.post(`/api/v1/encounters/${enc.id}/diagnoses`, {
    data: {
      description: 'Suspected acute decompensated heart failure',
      icd10Code: 'I50.9',
      type: 'PRIMARY',
      certainty: 'PROVISIONAL',
    },
  });
  await doc.post(`/api/v1/encounters/${enc.id}/medication-orders`, {
    data: {
      drugName: 'Furosemide',
      strength: '40 mg',
      form: 'tablet',
      dose: '1 tablet',
      frequency: 'every morning',
      durationDays: 5,
      quantity: 5,
      instructions: 'Review renal function and potassium within 3 days',
    },
  });
}

const only = process.argv.slice(2);
const sizeFilter = process.env.SIZES?.split(',') ?? Object.keys(sizes);
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
if (process.env.SHOTS_FIXTURES === '1') await ensureStressRecord(browser);
else
  console.log(
    'Not creating fixture records (SHOTS_FIXTURES is not set). Use `pnpm shots` for a clean, seeded review stack.',
  );
for (const [name, email, path, prepare] of screens) {
  if (only.length && !only.includes(name)) continue;
  for (const sizeName of sizeFilter) {
    const context = await browser.newContext({
      viewport: sizes[sizeName],
      baseURL: base,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    if (email) {
      const login = await page.request.post('/api/v1/auth/login', {
        data: { email, password: PASSWORD },
      });
      if (!login.ok()) throw new Error(`login failed for ${email}: ${login.status()}`);
    }
    const target = prepare ? await prepare(page) : path;
    await page.goto(target);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `screenshots/${name}.${sizeName}.png`,
      fullPage: process.env.FULL === '1',
    });
    await context.close();
  }
}
await browser.close();
console.log('Screenshots written to apps/web/screenshots');
