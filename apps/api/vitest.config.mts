import swc from 'unplugin-swc';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

try {
  process.loadEnvFile(join(import.meta.dirname, '../../.env'));
} catch {
  // CI provides the environment directly.
}

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://lumen_app:lumen_app_dev_password@localhost:5432/lumenhealth_test';
const testMigrationUrl =
  process.env.TEST_MIGRATION_DATABASE_URL ??
  'postgresql://lumen:lumen_dev_password@localhost:5432/lumenhealth_test';

export default defineConfig({
  // SWC emits the decorator metadata Nest's dependency injection relies on.
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      TEST_MIGRATION_DATABASE_URL: testMigrationUrl,
      LOG_LEVEL: process.env.TEST_LOG ?? 'silent',
      RATE_LIMIT_ENABLED: 'false',
      SWAGGER_ENABLED: 'false',
      SESSION_COOKIE_SECURE: 'false',
      WEB_ORIGINS: 'http://localhost:5173',
      EMAIL_DRIVER: 'memory',
      APP_BASE_URL: 'http://localhost:5173',
    },
    // Integration tests share one database; run files sequentially for determinism.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
