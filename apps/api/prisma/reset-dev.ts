/**
 * `pnpm db:reset`: drops and rebuilds the local DEVELOPMENT database from migrations plus the standard seed.
 *
 *   pnpm db:reset                      show the target and what it holds, then ask you to type its name
 *   pnpm db:reset --dry-run            show the target and what it holds, change nothing
 *   pnpm db:reset --confirm=lumenhealth   non-interactive; the value must equal the database name
 *
 * Every refusal happens before any destructive step (see dev-target.ts). Prisma's own protection that blocks
 * AI agents from running `migrate reset` is left in place and is not bypassed.
 */
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { checkDevelopmentTarget, confirmationMatches } from './dev-target';

const flag = (name: string) => process.argv.find((a) => a === name || a.startsWith(`${name}=`));
const dryRun = flag('--dry-run') !== undefined;
const confirmArg = flag('--confirm')?.split('=')[1];

// The same resolution as prisma.config.ts: MIGRATION_DATABASE_URL, else DATABASE_URL.
const migrationUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

async function summary(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const counts: Record<string, string> = {};
    for (const table of [
      'organizations',
      'users',
      'patients',
      'appointments',
      'encounters',
      'audit_events',
    ]) {
      try {
        counts[table] = (await client.query(`select count(*) n from ${table}`)).rows[0].n;
      } catch {
        counts[table] = '(table missing)';
      }
    }
    return counts;
  } catch (error) {
    return { error: String(error) };
  } finally {
    await client.end();
  }
}

async function main() {
  const target = checkDevelopmentTarget({
    migrationUrl,
    appUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  });

  console.log(
    `\nReset target: database "${target.database}" on ${target.host}:${target.port} (as ${target.user})`,
  );
  console.log('Currently holds:', await summary(migrationUrl!));
  console.log(
    'Everything in it will be dropped, then migrations and the demo seed will be applied.\n',
  );

  if (dryRun) {
    console.log('Dry run: nothing was changed.');
    return;
  }

  let typed = confirmArg;
  if (typed === undefined) {
    if (!process.stdin.isTTY)
      throw new Error(
        'Not interactive: pass --confirm=<database name> to proceed, or use --dry-run.',
      );
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    typed = await rl.question(`Type the database name (${target.database}) to confirm: `);
    rl.close();
  }
  if (!confirmationMatches(target, typed))
    throw new Error('Confirmation did not match. Nothing was changed.');

  const cwd = join(__dirname, '..');
  // Both steps are pinned to the URL that was just checked, not re-resolved from the environment.
  const env = { ...process.env, MIGRATION_DATABASE_URL: migrationUrl };
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'reset', '--force'], {
    cwd,
    env,
    stdio: 'inherit',
  });
  execFileSync('node', ['--import', 'tsx', 'prisma/seed.ts'], { cwd, env, stdio: 'inherit' });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
