import { defineConfig, devices } from '@playwright/test';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url).pathname);
} catch {
  // CI provides the environment directly.
}

const API_PORT = 4010;
const WEB_PORT = 5174;
const e2eAppUrl =
  process.env.E2E_DATABASE_URL ??
  'postgresql://lumen_app:lumen_app_dev_password@localhost:5432/lumenhealth_e2e';

// Locally use the Chrome you already have; CI installs Playwright's own Chromium.
const channel = process.env.CI ? undefined : 'chrome';

export default defineConfig({
  testDir: './e2e',
  // Prove the run started from the documented seed and did not write to the development database.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel } }],
  webServer: [
    {
      // Recreate and seed the disposable database, then run the production build of the API.
      command:
        'pnpm --filter @lumen/api e2e:prepare && pnpm --filter @lumen/api build && pnpm --filter @lumen/api start',
      url: `http://127.0.0.1:${API_PORT}/api/v1/health/ready`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: e2eAppUrl,
        API_PORT: String(API_PORT),
        WEB_ORIGINS: `http://localhost:${WEB_PORT}`,
        LOG_LEVEL: 'warn',
        RATE_LIMIT_ENABLED: 'false',
        SWAGGER_ENABLED: 'false',
      },
    },
    {
      command: 'pnpm --filter @lumen/web exec vite',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { WEB_PORT: String(WEB_PORT), VITE_API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
    },
  ],
});
