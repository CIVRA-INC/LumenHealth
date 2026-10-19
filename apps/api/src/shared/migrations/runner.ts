export type Migration = {
  /** Sortable, unique, e.g. "0001". */
  version: string;
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
};

export interface MigrationStore {
  /** Returns false when another runner holds the lock. */
  acquireLock(): Promise<boolean>;
  releaseLock(): Promise<void>;
  applied(): Promise<string[]>;
  record(version: string, name: string): Promise<void>;
  remove(version: string): Promise<void>;
}

export class MigrationRunner {
  constructor(
    private readonly store: MigrationStore,
    private readonly migrations: Migration[],
  ) {
    const versions = migrations.map((m) => m.version);
    if (new Set(versions).size !== versions.length) throw new Error('duplicate migration version');
  }

  private sorted(): Migration[] {
    return [...this.migrations].sort((a, b) => a.version.localeCompare(b.version));
  }

  private async locked<T>(fn: () => Promise<T>): Promise<T> {
    if (!(await this.store.acquireLock())) throw new Error('another migration run holds the lock');
    try {
      return await fn();
    } finally {
      await this.store.releaseLock();
    }
  }

  /** Applies pending migrations in order. Idempotent: applied versions are skipped. */
  up(): Promise<string[]> {
    return this.locked(async () => {
      const done = new Set(await this.store.applied());
      const ran: string[] = [];
      for (const m of this.sorted()) {
        if (done.has(m.version)) continue;
        await m.up();
        await this.store.record(m.version, m.name);
        ran.push(m.version);
      }
      return ran;
    });
  }

  /** Reverts the most recent `steps` applied migrations. */
  down(steps = 1): Promise<string[]> {
    return this.locked(async () => {
      const done = new Set(await this.store.applied());
      const reverted: string[] = [];
      for (const m of this.sorted().reverse()) {
        if (reverted.length >= steps) break;
        if (!done.has(m.version)) continue;
        await m.down();
        await this.store.remove(m.version);
        reverted.push(m.version);
      }
      return reverted;
    });
  }
}

export class InMemoryMigrationStore implements MigrationStore {
  private history = new Map<string, string>();
  private locked = false;

  async acquireLock() {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }
  async releaseLock() {
    this.locked = false;
  }
  async applied() {
    return [...this.history.keys()];
  }
  async record(version: string, name: string) {
    this.history.set(version, name);
  }
  async remove(version: string) {
    this.history.delete(version);
  }
}
