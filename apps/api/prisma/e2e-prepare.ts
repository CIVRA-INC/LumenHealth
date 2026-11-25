/**
 * Recreates the disposable end-to-end database, applies migrations and loads the demo seed.
 * Refuses to touch any database whose name does not end in "_e2e".
 */
import { disposableTarget, recreateAndSeed } from './disposable-db';

async function main() {
  await recreateAndSeed(disposableTarget(process.env.E2E_MIGRATION_DATABASE_URL, '_e2e'));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
