/**
 * Recreates the disposable visual-review database: migrations plus the SAME standard demo seed as
 * development (no extra records). Used by `pnpm shots`, which then adds its adversarial fixtures (a very
 * long name and note) to this database only. Refuses any database not named "*_visual".
 *
 * The URL is VISUAL_MIGRATION_DATABASE_URL, or the end-to-end URL with `_e2e` replaced by `_visual`.
 */
import { deriveUrl, disposableTarget, recreateAndSeed } from './disposable-db';

async function main() {
  const e2e = process.env.E2E_MIGRATION_DATABASE_URL;
  const configured =
    process.env.VISUAL_MIGRATION_DATABASE_URL ??
    (e2e ? deriveUrl(e2e, '_e2e', '_visual') : undefined);
  await recreateAndSeed(disposableTarget(configured, '_visual'));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
