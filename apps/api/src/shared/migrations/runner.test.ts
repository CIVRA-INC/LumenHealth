import { describe, expect, it } from "vitest";
import { InMemoryMigrationStore, MigrationRunner, type Migration } from "./runner.js";

describe("MigrationRunner", () => {
  const calls: string[] = [];
  const make = (version: string): Migration => ({
    version,
    name: `m${version}`,
    up: async () => void calls.push(`up${version}`),
    down: async () => void calls.push(`down${version}`),
  });

  it("is idempotent and records applied versions", async () => {
    const store = new InMemoryMigrationStore();
    const runner = new MigrationRunner(store, [make("0002"), make("0001")]);
    expect(await runner.up()).toEqual(["0001", "0002"]);
    expect(await runner.up()).toEqual([]);
    expect(await store.applied()).toEqual(["0001", "0002"]);
  });

  it("reverts the latest migration and refuses concurrent runs", async () => {
    const store = new InMemoryMigrationStore();
    const runner = new MigrationRunner(store, [make("0001"), make("0002")]);
    await runner.up();
    expect(await runner.down()).toEqual(["0002"]);
    await store.acquireLock();
    await expect(runner.up()).rejects.toThrow("lock");
  });
});
