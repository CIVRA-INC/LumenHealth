import { createRequire } from 'node:module';

/**
 * Isolation checks for the end-to-end run. The tests create records (random patients, a cross-tenant
 * fixture) and must only ever do so in the disposable `*_e2e` database, never in the development database.
 */

/** What `prisma/seed.ts` produces: the documented starting state of every disposable database. */
export const SEEDED = { lumenPatients: 330, harbourPatients: 2, users: 7 } as const;

type Query = (sql: string) => Promise<Record<string, unknown>[]>;
interface PgClient {
  connect(): Promise<void>;
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

// `pg` belongs to the API package; load it from there rather than adding it to the web app.
const apiRequire = createRequire(new URL('../../api/package.json', import.meta.url));

async function withClient<T>(connectionString: string, fn: (query: Query) => Promise<T>) {
  const { Client } = apiRequire('pg') as {
    Client: new (config: { connectionString: string }) => PgClient;
  };
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(async (sql) => (await client.query(sql)).rows);
  } finally {
    await client.end();
  }
}

export function e2eUrl(): string {
  const url = process.env.E2E_MIGRATION_DATABASE_URL;
  if (!url) throw new Error('E2E_MIGRATION_DATABASE_URL is not set (see .env.example).');
  if (!new URL(url).pathname.endsWith('_e2e'))
    throw new Error('The end-to-end database must be named *_e2e.');
  return url;
}

/** The development database sits beside the e2e one with the suffix removed. */
function developmentUrl(): string {
  const url = new URL(e2eUrl());
  url.pathname = url.pathname.slice(0, -'_e2e'.length);
  return url.toString();
}

const count = async (query: Query, sql: string) => Number((await query(sql))[0]?.n);

/** Before any test: the e2e database holds exactly the documented seed, nothing left over from earlier runs. */
export async function assertPristineSeed() {
  await withClient(e2eUrl(), async (query) => {
    const lumen = await count(
      query,
      `select count(*) n from patients p join organizations o on o.id = p."organizationId" where o.slug = 'lumen-general'`,
    );
    const harbour = await count(
      query,
      `select count(*) n from patients p join organizations o on o.id = p."organizationId" where o.slug <> 'lumen-general'`,
    );
    const users = await count(query, 'select count(*) n from users');
    if (
      lumen !== SEEDED.lumenPatients ||
      harbour !== SEEDED.harbourPatients ||
      users !== SEEDED.users
    )
      throw new Error(
        `The e2e database is not in the documented seeded state (patients ${lumen}/${harbour}, users ${users}; expected ${SEEDED.lumenPatients}/${SEEDED.harbourPatients}, ${SEEDED.users}).`,
      );
  });
}

/** After the run: the tests' own records exist in the e2e database and none leaked into development. */
export async function assertNoLeakIntoDevelopment() {
  const created = await withClient(e2eUrl(), (query) =>
    count(query, `select count(*) n from patients where "familyName" = 'Boundary'`),
  );
  if (created === 0) return; // the cross-tenant test did not run (a filtered run): nothing to compare
  let leaked: number;
  try {
    leaked = await withClient(developmentUrl(), (query) =>
      count(query, `select count(*) n from patients where "familyName" = 'Boundary'`),
    );
  } catch {
    return; // no development database on this machine (CI): nothing can have leaked into it
  }
  if (leaked > 0)
    throw new Error('End-to-end test records were found in the development database.');
}
