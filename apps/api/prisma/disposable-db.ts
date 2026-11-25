/**
 * Helpers for databases that are dropped and rebuilt on demand: the end-to-end database (`*_e2e`) and the
 * visual-review database (`*_visual`). Both are recreated from migrations plus the standard demo seed, so a
 * run always starts from the same documented state and records never accumulate between runs.
 *
 * The suffix check is the safety: these helpers refuse to touch any database that is not named for the
 * purpose, so a mistyped URL can never drop the development database.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { Client } from 'pg';
import { LOCAL_HOSTS } from './dev-target';

export interface DisposableTarget {
  url: string;
  name: string;
}

/** Validates a connection string and returns the database name, or throws when it is not disposable. */
export function disposableTarget(
  connectionString: string | undefined,
  suffix: string,
): DisposableTarget {
  if (!connectionString) throw new Error('No database URL was given.');
  const parsed = new URL(connectionString);
  const name = parsed.pathname.slice(1);
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Refusing to reset "${name}" on ${parsed.hostname}: only a database on this machine can be dropped and recreated.`,
    );
  }
  if (!name.endsWith(suffix)) {
    throw new Error(
      `Refusing to reset "${name}": this database must be named *${suffix} (it is dropped and recreated).`,
    );
  }
  return { url: connectionString, name };
}

/** Swaps one disposable database name for another in a URL, e.g. `_e2e` to `_visual`. */
export function deriveUrl(connectionString: string, from: string, to: string): string {
  const url = new URL(connectionString);
  if (!url.pathname.endsWith(from))
    throw new Error(`Cannot derive a ${to} URL from "${url.pathname.slice(1)}".`);
  url.pathname = url.pathname.slice(0, -from.length) + to;
  return url.toString();
}

/** Drops and recreates the (empty) database. */
export async function recreateEmpty(target: DisposableTarget): Promise<void> {
  const admin = new URL(target.url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${target.name}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${target.name}"`);
  } finally {
    await client.end();
  }
}

/** Applies every migration, as the schema owner. */
export function migrate(target: DisposableTarget, stdio: 'inherit' | 'pipe' = 'inherit'): void {
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: join(__dirname, '..'),
    env: { ...process.env, MIGRATION_DATABASE_URL: target.url },
    stdio,
  });
}

/** Drops and recreates the database, applies every migration, then loads the standard demo seed. */
export async function recreateAndSeed(target: DisposableTarget): Promise<void> {
  await recreateEmpty(target);
  migrate(target);
  execFileSync('node', ['--import', 'tsx', 'prisma/seed.ts'], {
    cwd: join(__dirname, '..'),
    env: { ...process.env, MIGRATION_DATABASE_URL: target.url },
    stdio: 'inherit',
  });
}
