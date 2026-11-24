import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS, signInAs } from './helpers';

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
  expect(summary, 'accessibility violations').toEqual([]);
}

test.describe('accessibility (WCAG 2.1 A/AA automated checks)', () => {
  test('sign-in page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('dashboard, patient list and schedule', async ({ page }) => {
    await signInAs(page, ACCOUNTS.frontDesk);
    for (const [path, heading] of [
      ['/', 'Today'],
      ['/patients', 'Patients'],
      ['/schedule', 'Schedule'],
      ['/patients/new', 'Register patient'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectNoViolations(page);
    }
  });

  test('encounter workspace', async ({ page }) => {
    await signInAs(page, ACCOUNTS.clinician2);
    await page.goto('/consultations');
    await page
      .getByRole('link', { name: /.+/ })
      .filter({ hasText: /^[A-Z]/ })
      .first()
      .waitFor();
    await page.locator('tbody a').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectNoViolations(page);
  });

  test('design system reference', async ({ page }) => {
    await signInAs(page, ACCOUNTS.admin);
    await page.goto('/design-system');
    await expect(page.getByRole('heading', { name: 'Design system', level: 1 })).toBeVisible();
    await expectNoViolations(page);
  });
});
