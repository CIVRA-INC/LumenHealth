import { expect, test, type Browser, type Page } from '@playwright/test';
import { ACCOUNTS, apiSignIn, randomName, registerPatientViaApi, signInAs } from './helpers';

/** A patient with a very long name, in a fresh in-progress encounter, created through the API. */
async function startLongNameEncounter(browser: Browser) {
  const given = `${randomName('Oluwadamilare')}-Maximiliana`;
  const family = `${randomName('Chukwuemeka')} Adebayo-Nwachukwu-Okonkwo`;

  const desk = await browser.newContext();
  const deskPage = await desk.newPage();
  await apiSignIn(deskPage.request, ACCOUNTS.frontDesk);
  const patient = await registerPatientViaApi(deskPage.request, {
    givenName: given,
    familyName: family,
    emergencyContacts: [
      {
        name: 'Her Royal Highness Adaobi Nwachukwu-Adebayo',
        relationship: 'Spouse',
        phone: '08031230000',
      },
    ],
  });
  const walkIn = await (
    await deskPage.request.post('/api/v1/queue/walk-ins', {
      data: { patientId: patient.id, reason: 'Review' },
    })
  ).json();
  await desk.close();

  const doc = await browser.newContext();
  const docPage = await doc.newPage();
  await apiSignIn(docPage.request, ACCOUNTS.clinician);
  const encounter = await (
    await docPage.request.post('/api/v1/encounters', {
      data: { appointmentId: walkIn.id, expectedPatientId: patient.id },
    })
  ).json();
  await doc.close();
  return { id: encounter.id as string, name: `${given} ${family}` };
}

async function expectHeaderIsClear(page: Page, name: string) {
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(name); // the whole name, never shortened
  const action = page.getByRole('button', { name: 'Review and sign' });
  const h = await heading.boundingBox();
  const a = await action.boundingBox();
  expect(h && a).toBeTruthy();
  // The primary action never shares a line with the name, so they cannot collide.
  expect(a!.y).toBeGreaterThanOrEqual(h!.y + h!.height - 1);
  expect(h!.x + h!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}

for (const size of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
]) {
  test(`encounter header at ${size.width}px: full name, clear actions, no repeated identity`, async ({
    browser,
  }) => {
    const { id, name } = await startLongNameEncounter(browser);
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    await signInAs(page, ACCOUNTS.clinician);
    await page.goto(`/encounters/${id}`);
    await expectHeaderIsClear(page, name);

    // The breadcrumb says which visit this is, not who the patient is.
    const crumbs = page.getByRole('banner').getByRole('navigation');
    await expect(crumbs).toContainText('Consultations');
    await expect(crumbs).not.toContainText('Oluwadamilare');

    // The context rail is the supporting column: contact details, but not the name again.
    const rail = page.getByRole('complementary', { name: 'Encounter context' });
    await expect(rail.getByText('Phone')).toBeVisible();
    await expect(rail.getByText('Emergency')).toBeVisible();
    await expect(rail.getByText('Adaobi Nwachukwu-Adebayo')).toBeVisible();
    await expect(rail).not.toContainText('Oluwadamilare');
    await context.close();
  });
}

test('on a phone the context is a disclosure above the note, closed until opened', async ({
  browser,
}) => {
  const { id, name } = await startLongNameEncounter(browser);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await signInAs(page, ACCOUNTS.clinician);
  await page.goto(`/encounters/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);

  const summary = page.getByText('Patient and visit details');
  await expect(summary).toBeVisible();
  await expect(page.getByText('Emergency')).toBeHidden();
  const note = page.getByRole('heading', { name: 'Consultation note' });
  const above = (await summary.boundingBox())!.y < (await note.boundingBox())!.y;
  expect(above).toBe(true);

  await summary.click();
  await expect(page.getByText('Emergency')).toBeVisible();
  await expect(page.getByText('Adaobi Nwachukwu-Adebayo')).toBeVisible();
  await context.close();
});
