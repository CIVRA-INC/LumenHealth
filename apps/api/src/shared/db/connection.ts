import { MongoClient, type Db } from 'mongodb';

export type DbConfig = {
  uri: string;
  dbName: string;
  connectTimeoutMs: number;
  maxPoolSize: number;
  retries: number;
  retryDelayMs: number;
};

/** Reads and validates DB settings; returns undefined when no database is configured. */
export function readDbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig | undefined {
  if (!env.MONGODB_URI) return undefined;
  const num = (key: string, fallback: number) => {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number`);
    return value;
  };
  return {
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB ?? 'lumenhealth',
    connectTimeoutMs: num('MONGODB_CONNECT_TIMEOUT_MS', 5000),
    maxPoolSize: num('MONGODB_MAX_POOL_SIZE', 20),
    retries: num('MONGODB_CONNECT_RETRIES', 3),
    retryDelayMs: num('MONGODB_RETRY_DELAY_MS', 1000),
  };
}

let client: MongoClient | undefined;
let db: Db | undefined;

/** Connects with retries; throws (so the API refuses to start) when the DB is unreachable. */
export async function connectDb(config: DbConfig): Promise<Db> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      client = new MongoClient(config.uri, {
        serverSelectionTimeoutMS: config.connectTimeoutMs,
        connectTimeoutMS: config.connectTimeoutMs,
        maxPoolSize: config.maxPoolSize,
      });
      await client.connect();
      db = client.db(config.dbName);
      await db.command({ ping: 1 });
      return db;
    } catch (err) {
      lastError = err;
      await client?.close().catch(() => undefined);
      client = undefined;
      if (attempt < config.retries) await new Promise((r) => setTimeout(r, config.retryDelayMs));
    }
  }
  throw new Error(`database unreachable after ${config.retries + 1} attempts: ${String(lastError)}`);
}

/** Readiness probe: true when connected and the server answers a ping. */
export async function isDbReady(): Promise<boolean> {
  if (!db) return false;
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await client?.close();
  client = undefined;
  db = undefined;
}
