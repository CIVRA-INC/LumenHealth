import { expect, test } from '@playwright/test';
import { ACCOUNTS, DEMO_PASSWORD, randomName, randomPhone, signInAs } from './helpers';

test.describe('sign-in', () => {
  test('an authorised user signs in and sees the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('Email').fill(ACCOUNTS.clinician);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Waiting' })).toBeVisible();
  });

  test('a wrong password is rejected with a generic message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ACCOUNTS.clinician);
    await page.getByLabel('Password').fill('not-the-password-1');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Incorrect email or password');
    await expect(page).toHaveURL(/\/login/);
  });
});

test('registers a patient, finds them, queues a walk-in and completes the consultation', async ({
  browser,
}) => {
  const given = randomName('Ada');
  const family = randomName('Eze');

  // ── Front desk: register, search, add to the queue ──────────────────────────
  const deskContext = await browser.newContext();
  const desk = await deskContext.newPage();
  await signInAs(desk, ACCOUNTS.frontDesk);

  await desk.goto('/patients/new');
  await desk.getByLabel('First name').fill(given);
  await desk.getByLabel('Last name').fill(family);
  await desk.getByLabel('Date of birth').fill('1992-03-04');
  await desk.getByLabel('Sex').selectOption('FEMALE');
  await desk.getByLabel('Phone number').first().fill(randomPhone());
  await desk.getByRole('button', { name: 'Register patient' }).click();

  await expect(desk).toHaveURL(/\/patients\/[0-9a-f-]{36}$/);
  await expect(desk.getByText(`${given} ${family}`).first()).toBeVisible();
  await expect(desk.getByText(/^LH-\d{6}$/).first()).toBeVisible();

  await expect(desk.getByText(/registered as LH-\d{6}/)).toBeVisible();
  await desk.getByRole('button', { name: 'Add to today’s queue' }).click();
  const walkIn = desk.getByRole('dialog');
  await walkIn.getByLabel('Reason for visit').fill('Fever and headache for three days');
  await walkIn.getByRole('button', { name: 'Add to queue' }).click();
  await expect(desk.getByText(/added to the queue/)).toBeVisible();

  // The patient is findable in the registry.
  await desk.goto('/patients');
  await desk.getByLabel('Search patients').fill(family);
  await expect(desk.getByRole('link', { name: `${given} ${family}` })).toBeVisible();
  await deskContext.close();

  // ── Clinician: open the correct encounter and document it ───────────────────
  const docContext = await browser.newContext();
  const doc = await docContext.newPage();
  await signInAs(doc, ACCOUNTS.clinician);
  await doc.goto('/');

  const row = doc.getByRole('row').filter({ hasText: `${given} ${family}` });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Start' }).click();
  await expect(doc).toHaveURL(/\/encounters\/[0-9a-f-]{36}$/);
  // The patient banner shows exactly who this chart belongs to.
  await expect(doc.getByText(`${given} ${family}`).first()).toBeVisible();

  // Vitals
  await doc.getByRole('button', { name: 'Record vitals' }).click();
  const vitals = doc.getByRole('dialog');
  await vitals.getByLabel('Temperature (°C)').fill('38.4');
  await vitals.getByLabel('Heart rate (bpm)').fill('96');
  await vitals.getByLabel('Systolic BP (mmHg)').fill('128');
  await vitals.getByLabel('Diastolic BP (mmHg)').fill('82');
  await vitals.getByRole('button', { name: 'Save vitals' }).click();
  await expect(doc.getByText('128/82')).toBeVisible();

  // Note (autosaved draft)
  await doc.getByLabel('Chief complaint').fill('Fever and headache for three days');
  await expect(doc.getByText(/Draft saved/)).toBeVisible();

  // Signing is blocked until the documentation is complete.
  await doc.getByRole('button', { name: 'Review and sign' }).click();
  await expect(doc.getByText('Complete the required items before signing.')).toBeVisible();
  await doc.getByRole('button', { name: 'Cancel' }).click();

  // Diagnosis
  await doc.getByRole('button', { name: 'Add diagnosis' }).click();
  await doc.getByRole('textbox', { name: /^Diagnosis/ }).fill('Uncomplicated malaria');
  await doc.getByLabel('ICD-10 code').fill('B54');
  await doc.getByRole('button', { name: 'Add diagnosis' }).click();
  await expect(doc.getByText('Uncomplicated malaria')).toBeVisible();

  // Prescription (draft until signed)
  await doc.getByRole('button', { name: 'Add medication' }).click();
  const order = doc.getByRole('dialog');
  await order.getByLabel('Medication').fill('Artemether/lumefantrine');
  await order.getByLabel('Dose').fill('4 tablets');
  await order.getByLabel('Frequency').fill('twice daily');
  await order.getByRole('button', { name: 'Add medication' }).click();
  await expect(doc.getByText('Draft', { exact: true })).toBeVisible();

  // Sign, with explicit acknowledgement.
  await doc.getByRole('button', { name: 'Review and sign' }).click();
  const sign = doc.getByRole('alertdialog');
  await expect(sign.getByRole('button', { name: 'Sign encounter' })).toBeDisabled();
  await sign.getByLabel(/I have reviewed this documentation/).check();
  await sign.getByRole('button', { name: 'Sign encounter' }).click();

  await expect(doc.getByText('Signed', { exact: true }).first()).toBeVisible();
  await expect(doc.getByText('Signed and locked')).toBeVisible();
  await expect(doc.getByText('Active', { exact: true })).toBeVisible();
  // Documentation can no longer be edited; corrections are addenda.
  await expect(doc.getByRole('textbox', { name: 'Chief complaint' })).toHaveCount(0);
  await expect(doc.getByRole('button', { name: 'Review and sign' })).toHaveCount(0);

  await doc.getByRole('button', { name: 'Add addendum' }).click();
  await doc.getByLabel('Addendum').fill('Patient reports no known drug allergies.');
  await doc.getByRole('button', { name: 'Add to record' }).click();
  await expect(doc.getByText('Patient reports no known drug allergies.')).toBeVisible();

  // Close with a disposition.
  await doc.getByRole('button', { name: 'Close encounter' }).click();
  await doc.getByRole('dialog').getByRole('button', { name: 'Close encounter' }).click();
  await expect(doc.getByText('Closed', { exact: true }).first()).toBeVisible();
  await expect(doc.getByRole('button', { name: 'Close encounter' })).toHaveCount(0);
  await docContext.close();
});

test('warns about a possible duplicate registration and requires explicit confirmation', async ({
  page,
}) => {
  await signInAs(page, ACCOUNTS.frontDesk);
  const given = randomName('Dup');
  const family = randomName('Lic');
  const fill = async () => {
    await page.goto('/patients/new');
    await page.getByLabel('First name').fill(given);
    await page.getByLabel('Last name').fill(family);
    await page.getByLabel('Date of birth').fill('1980-02-02');
    await page.getByLabel('Sex').selectOption('MALE');
    await page.getByLabel('Phone number').first().fill(randomPhone());
  };

  await fill();
  await page.getByRole('button', { name: 'Register patient' }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}$/);

  await fill();
  await expect(page.getByText('This person may already be registered')).toBeVisible();
  await page.getByRole('button', { name: 'Register patient' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByText('Possible duplicate patient')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Register as new patient' })).toBeDisabled();
  await dialog.getByLabel(/different person/).check();
  await dialog.getByRole('button', { name: 'Register as new patient' }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}$/);
});
