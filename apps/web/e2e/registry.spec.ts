import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS, randomName, registerPatientViaApi, signInAs } from './helpers';

const rows = (page: Page, name: string) => page.getByRole('table', { name }).locator('tbody tr');
const summary = (page: Page) =>
  page
    .getByRole('navigation', { name: 'Pagination' })
    .getByText(/of \d+ (patient|patients|people|events)/);

async function firstRowText(page: Page) {
  return (await rows(page, 'Patients').first().innerText()).split('\n')[0];
}

test.describe('patient registry: server-side search, sorting and pagination', () => {
  test.beforeEach(async ({ page }) => signInAs(page, ACCOUNTS.frontDesk));

  test('pages through real records, and the page lives in the URL', async ({ page }) => {
    await page.goto('/patients');
    await expect(rows(page, 'Patients')).toHaveCount(25);
    await expect(summary(page)).toHaveText(/^1–25 of \d+ patients$/);
    const firstOfPage1 = await firstRowText(page);

    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(summary(page)).toHaveText(/^26–50 of \d+ patients$/);
    expect(await firstRowText(page)).not.toBe(firstOfPage1);
    const firstOfPage2 = await firstRowText(page);

    // A refresh, and a bookmark, land on the same page.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(await firstRowText(page)).toBe(firstOfPage2);

    await page.getByRole('button', { name: 'Last page' }).click();
    await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(await rows(page, 'Patients').count()).toBeLessThanOrEqual(25);
    expect(await rows(page, 'Patients').count()).toBeGreaterThan(0);

    // The browser's Back button returns through the pages.
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
    await page.goto('/patients?page=2');
    await page.getByRole('button', { name: 'First page' }).click();
    await expect(summary(page)).toHaveText(/^1–25 of/);
  });

  test('a page past the end moves to the last real page', async ({ page }) => {
    await page.goto('/patients?page=9999');
    await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await expect(rows(page, 'Patients').first()).toBeVisible();
    await expect(page).not.toHaveURL(/page=9999/);
  });

  test('changes page size and returns to the first page', async ({ page }) => {
    await page.goto('/patients?page=3');
    await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('10');
    await expect(page).toHaveURL(/pageSize=10/);
    await expect(rows(page, 'Patients')).toHaveCount(10);
    await expect(summary(page)).toHaveText(/^1–10 of/);
    await expect(page).not.toHaveURL(/page=3/);
  });

  test('sorts on the server by name, in both directions', async ({ page }) => {
    await page.goto('/patients');
    const heading = page.getByRole('columnheader', { name: /Patient/ });
    const sorted = (direction: string) =>
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/patients') &&
          r.url().includes('sort=name') &&
          r.url().includes(`order=${direction}`) &&
          r.ok(),
      );
    await Promise.all([sorted('asc'), heading.getByRole('button').click()]);
    await expect(page).toHaveURL(/sort=name/);
    await expect(heading).toHaveAttribute('aria-sort', 'ascending');
    const ascending = await rows(page, 'Patients').locator('td:first-child a').allInnerTexts();
    // Names sort by family name then given name; the first row's family name must not come after the last row's.
    const family = (full: string) => full.split(' ').slice(-1)[0]!.toLowerCase();
    expect(family(ascending[0]!) <= family(ascending[ascending.length - 1]!)).toBe(true);

    await Promise.all([sorted('desc'), heading.getByRole('button').click()]);
    await expect(heading).toHaveAttribute('aria-sort', 'descending');
    await expect(
      page.getByRole('table', { name: 'Patients' }).locator('..').locator('..'),
    ).not.toHaveAttribute('aria-busy', 'true');
    const descending = await rows(page, 'Patients').locator('td:first-child a').allInnerTexts();
    expect(family(descending[0]!) >= family(descending[descending.length - 1]!)).toBe(true);
    expect(descending[0]).not.toBe(ascending[0]);
  });

  test('searching narrows the count, resets to page one, and clearing restores the list', async ({
    page,
  }) => {
    await page.goto('/patients?page=3');
    const total = (await summary(page).innerText()).match(/of (\d+)/)![1]!;
    await page.getByRole('searchbox', { name: 'Search patients' }).fill('Okafor');
    await expect(page).toHaveURL(/q=Okafor/);
    await expect(page).not.toHaveURL(/page=3/);
    await expect(summary(page)).toHaveText(/^1–\d+ of \d+ patients$/);
    expect((await summary(page).innerText()).match(/of (\d+)/)![1]).not.toBe(total);
    for (const name of await rows(page, 'Patients').locator('td:first-child a').allInnerTexts())
      expect(name.toLowerCase()).toContain('okafor');

    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(summary(page)).toHaveText(new RegExp(`^1–25 of ${total} patients$`));
  });

  test('says so plainly when nothing matches, and offers a way back', async ({ page }) => {
    await page.goto('/patients?q=zzzznobodyhasthisname');
    await expect(page.getByText('No patients match “zzzznobodyhasthisname”')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search' }).first().click();
    await expect(rows(page, 'Patients').first()).toBeVisible();
  });

  test('an interrupted request shows an error with a retry, not stale rows', async ({ page }) => {
    await page.route('**/api/v1/patients?*', (route) => route.abort());
    await page.goto('/patients');
    await expect(page.getByText('Patients could not be loaded')).toBeVisible();
    await page.unroute('**/api/v1/patients?*');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(rows(page, 'Patients').first()).toBeVisible();
  });
});

test.describe('other collections use the same table', () => {
  test('staff: filters and search are applied by the server and kept in the URL', async ({
    page,
  }) => {
    await signInAs(page, ACCOUNTS.admin);
    await page.goto('/admin/users');
    await expect(rows(page, 'Staff')).toHaveCount(5);
    await page.getByRole('combobox', { name: 'Role' }).selectOption('CLINICIAN');
    await expect(page).toHaveURL(/role=CLINICIAN/);
    await expect(rows(page, 'Staff')).toHaveCount(2);
    await page.getByRole('searchbox', { name: 'Search staff' }).fill('bello');
    await expect(rows(page, 'Staff')).toHaveCount(1);
    await page.getByRole('button', { name: /Clear filters/ }).click();
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(rows(page, 'Staff')).toHaveCount(5);
  });

  test('audit log: result filter and paging', async ({ page, browser }) => {
    // Make sure there is at least one refused request to find.
    const other = await browser.newContext();
    const desk = await other.newPage();
    await signInAs(desk, ACCOUNTS.frontDesk);
    expect((await desk.request.get('/api/v1/encounters')).status()).toBe(403);
    await other.close();
    await signInAs(page, ACCOUNTS.admin);
    await page.goto('/admin/audit?pageSize=25');
    await expect(rows(page, 'Audit events').first()).toBeVisible();
    await page.getByRole('combobox', { name: 'Result' }).selectOption('DENIED');
    await expect(page).toHaveURL(/outcome=DENIED/);
    for (const text of await rows(page, 'Audit events').locator('td:last-child').allInnerTexts())
      expect(text).toContain('Refused');
  });
});

test.describe('registry craft: long names and phone-width defaults', () => {
  test('a very long name is shown in full, wrapped inside the table, never cut off', async ({
    page,
  }) => {
    await signInAs(page, ACCOUNTS.frontDesk);
    const given = `${randomName('Oluwadamilare')}-Maximiliana`;
    const unique = randomName('Chukwuemeka');
    const family = `${unique} Adebayo-Nwachukwu-Okonkwo`;
    await registerPatientViaApi(page.request, { givenName: given, familyName: family });
    await page.goto(`/patients?q=${unique}`);
    const link = page.getByRole('table', { name: 'Patients' }).getByRole('link').first();
    await expect(link).toContainText('Nwachukwu-Okonkwo');
    // Not truncated by CSS: the text is wholly visible and the table does not scroll sideways.
    const box = await link.boundingBox();
    const table = await page.getByRole('table', { name: 'Patients' }).boundingBox();
    expect(box && table && box.x + box.width <= table.x + table.width).toBeTruthy();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await expect(link).toHaveAttribute('title', new RegExp(given));
  });

  test('a phone defaults to 10 rows per page, and the footer says which page this is', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signInAs(page, ACCOUNTS.frontDesk);
    await page.goto('/patients');
    await expect(page.getByRole('list', { name: 'Patients' }).getByRole('listitem')).toHaveCount(
      10,
    );
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
    await context.close();
  });
});
