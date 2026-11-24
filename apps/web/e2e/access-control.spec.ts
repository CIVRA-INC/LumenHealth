import { expect, test } from '@playwright/test';
import { ACCOUNTS, apiSignIn, registerPatientViaApi, signInAs } from './helpers';

test('a user without clinical permission cannot reach clinical records', async ({ page }) => {
  await signInAs(page, ACCOUNTS.frontDesk);

  // The page explains the restriction…
  await page.goto('/consultations');
  await expect(page.getByText('You don’t have access to this page')).toBeVisible();

  // …and the API refuses regardless of what the UI shows.
  expect((await page.request.get('/api/v1/encounters')).status()).toBe(403);
  const patient = await registerPatientViaApi(page.request);
  expect((await page.request.get(`/api/v1/patients/${patient.id}/encounters`)).status()).toBe(403);
});

test('administrators manage staff but have no clinical access', async ({ page }) => {
  await signInAs(page, ACCOUNTS.admin);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Staff' })).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Staff' }).getByText('Dr. Ifeanyi Okafor'),
  ).toBeVisible();
  await page.goto('/consultations');
  await expect(page.getByText('You don’t have access to this page')).toBeVisible();
});

test('a user from another organisation cannot see or change the record', async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await apiSignIn(owner.request, ACCOUNTS.frontDesk);
  const patient = await registerPatientViaApi(owner.request, {
    givenName: 'Tenant',
    familyName: 'Boundary',
  });
  await ownerContext.close();

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await signInAs(other, ACCOUNTS.otherOrgFrontDesk);

  await other.goto(`/patients/${patient.id}`);
  await expect(other.getByText('Patient not found')).toBeVisible();
  await expect(other.getByText('Boundary')).toHaveCount(0);

  expect((await other.request.get(`/api/v1/patients/${patient.id}`)).status()).toBe(404);
  expect(
    (
      await other.request.patch(`/api/v1/patients/${patient.id}`, {
        data: { version: 1, givenName: 'Hijacked' },
      })
    ).status(),
  ).toBe(404);
  const search = await other.request.get('/api/v1/patients', { params: { q: 'Boundary' } });
  expect((await search.json()).total).toBe(0);
  await otherContext.close();
});

test('sessions end on sign-out', async ({ page }) => {
  await signInAs(page, ACCOUNTS.clinician);
  await page.goto('/');
  await page.getByRole('button', { name: /Account menu/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get('/api/v1/dashboard')).status()).toBe(401);
});
