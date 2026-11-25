import { disposableTarget, migrate, recreateEmpty } from '../prisma/disposable-db';

/**
 * Rebuilds the dedicated test database from nothing before every run: dropped, recreated, then every migration
 * applied. Each run therefore starts empty (rows never accumulate) and proves the migrations work from scratch.
 * The target must be named `*_test`; the development database can never be selected here.
 */
export default async function setup() {
  const target = disposableTarget(
    process.env.TEST_MIGRATION_DATABASE_URL ??
      'postgresql://lumen:lumen_dev_password@localhost:5432/lumenhealth_test',
    '_test',
  );
  try {
    await recreateEmpty(target);
    migrate(target, 'pipe');
  } catch (error) {
    const out = (error as { stdout?: Buffer; stderr?: Buffer }).stdout?.toString() ?? '';
    const err = (error as { stderr?: Buffer }).stderr?.toString() ?? '';
    throw new Error(
      `Could not rebuild the test database. Is Postgres running (pnpm db:up)?\n${out}\n${err}`,
      { cause: error },
    );
  }
}
