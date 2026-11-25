/**
 * The safety check in front of `pnpm db:reset`, which drops everything in the database it targets.
 *
 * It is pure (no I/O) so it can be tested exhaustively, and it runs BEFORE anything destructive. It does not
 * rely on the developer remembering which environment is active: whatever the shell and `.env` resolve to is
 * inspected, and anything that is not clearly the local development database is refused.
 */

export const DEVELOPMENT_DATABASE = 'lumenhealth';
export const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export interface ResetTarget {
  host: string;
  port: string;
  database: string;
  user: string;
}

const describe = (connectionString: string): ResetTarget => {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
  };
};

/**
 * Resolves the single target of a reset, or throws saying why it is refused.
 * `migrationUrl` is what Prisma resolves (MIGRATION_DATABASE_URL, else DATABASE_URL); `appUrl` is what the API
 * and the seed's consumers use (DATABASE_URL). They must agree: two different databases means the environment
 * is not what the developer thinks it is.
 */
export function checkDevelopmentTarget(input: {
  migrationUrl: string | undefined;
  appUrl: string | undefined;
  nodeEnv: string | undefined;
}): ResetTarget {
  if (input.nodeEnv === 'production') throw new Error('Refusing to reset: NODE_ENV is production.');
  if (!input.migrationUrl)
    throw new Error('Refusing to reset: neither MIGRATION_DATABASE_URL nor DATABASE_URL is set.');

  const target = describe(input.migrationUrl);
  if (!LOCAL_HOSTS.has(target.host))
    throw new Error(
      `Refusing to reset "${target.database}" on ${target.host}: only a database on this machine can be reset.`,
    );
  if (target.database !== DEVELOPMENT_DATABASE)
    throw new Error(
      `Refusing to reset "${target.database}": \`db:reset\` only resets the development database "${DEVELOPMENT_DATABASE}". ` +
        'The e2e, visual and test databases are rebuilt automatically by their own commands.',
    );
  if (input.appUrl) {
    const app = describe(input.appUrl);
    if (app.host !== target.host || app.port !== target.port || app.database !== target.database)
      throw new Error(
        `Refusing to reset: DATABASE_URL points at "${app.database}" on ${app.host}:${app.port} but the migration URL ` +
          `points at "${target.database}" on ${target.host}:${target.port}. Fix .env or your shell environment first.`,
      );
  }
  return target;
}

/** The reset proceeds only when the person typed (or passed) the exact database name. */
export function confirmationMatches(target: ResetTarget, typed: string | undefined): boolean {
  return typed !== undefined && typed.trim() === target.database;
}
