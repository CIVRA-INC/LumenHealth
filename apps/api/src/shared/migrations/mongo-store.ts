import type { Db } from 'mongodb';
import type { MigrationStore } from './runner.js';

/** History in `schema_migrations`; the lock is a document with a fixed _id (insert fails if held). */
export class MongoMigrationStore implements MigrationStore {
  constructor(private readonly db: Db) {}

  async acquireLock() {
    try {
      await this.db.collection<{ _id: string }>('schema_migrations_lock').insertOne({ _id: 'lock' });
      return true;
    } catch {
      return false;
    }
  }

  async releaseLock() {
    await this.db.collection<{ _id: string }>('schema_migrations_lock').deleteOne({ _id: 'lock' });
  }

  async applied() {
    const rows = await this.db.collection<{ _id: string }>('schema_migrations').find().toArray();
    return rows.map((r) => r._id);
  }

  async record(version: string, name: string) {
    await this.db
      .collection<{ _id: string }>('schema_migrations')
      .updateOne({ _id: version }, { $set: { name, appliedAt: new Date() } }, { upsert: true });
  }

  async remove(version: string) {
    await this.db.collection<{ _id: string }>('schema_migrations').deleteOne({ _id: version });
  }
}
