import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Password for every seeded demo account (development data only; see prisma/seed.ts). */
export const DEMO_PASSWORD = 'LumenDemo!2026';

export const ACCOUNTS = {
  admin: 'admin@lumen.test',
  clinician: 'dr.okafor@lumen.test',
  clinician2: 'dr.bello@lumen.test',
  nurse: 'nurse.adeyemi@lumen.test',
  frontDesk: 'frontdesk@lumen.test',
  otherOrgFrontDesk: 'frontdesk@harbour.test',
} as const;

/** Signs in through the API so the page starts authenticated (the form itself has its own test). */
export async function signInAs(page: Page, email: string) {
  const res = await page.request.post('/api/v1/auth/login', {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(res.status(), `sign-in as ${email}`).toBe(200);
}

export async function apiSignIn(request: APIRequestContext, email: string) {
  const res = await request.post('/api/v1/auth/login', {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(res.status(), `sign-in as ${email}`).toBe(200);
}

/** Names are compared letters-only, so test names must be letters. */
export function randomName(prefix = 'E'): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  return prefix + Array.from({ length: 9 }, () => letters[Math.floor(Math.random() * 26)]).join('');
}

export function randomPhone(): string {
  return `0803${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`;
}

export async function registerPatientViaApi(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
) {
  const res = await request.post('/api/v1/patients', {
    data: {
      givenName: randomName('G'),
      familyName: randomName('F'),
      dateOfBirth: '1991-06-15',
      sex: 'FEMALE',
      phone: randomPhone(),
      ...overrides,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: string; mrn: string; givenName: string; familyName: string };
}
