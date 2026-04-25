import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindOne, mockFindOneAndUpdate } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockFindOneAndUpdate: vi.fn(),
}));

vi.mock(
  "../src/modules/migrations/models/migration-record.model",
  () => ({
    MigrationRecordModel: {
      findOne: mockFindOne,
      findOneAndUpdate: mockFindOneAndUpdate,
    },
  }),
);

import { runMigrations, type Migration } from "../src/modules/migrations/runner";

describe("runMigrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOneAndUpdate.mockResolvedValue({});
  });

  it("runs a pending migration and records it as applied", async () => {
    mockFindOne.mockResolvedValue(null);
    const up = vi.fn().mockResolvedValue(undefined);
    const migration: Migration = { name: "20240101_test", up };

    await runMigrations([migration]);

    expect(up).toHaveBeenCalledOnce();
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { name: "20240101_test" },
      expect.objectContaining({ status: "applied" }),
      { upsert: true, new: true },
    );
  });

  it("skips a migration already marked as applied", async () => {
    mockFindOne.mockResolvedValue({ status: "applied" });
    const up = vi.fn();
    const migration: Migration = { name: "20240101_already_done", up };

    await runMigrations([migration]);

    expect(up).not.toHaveBeenCalled();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("records a failed migration and re-throws the error", async () => {
    mockFindOne.mockResolvedValue(null);
    const up = vi.fn().mockRejectedValue(new Error("index creation failed"));
    const migration: Migration = { name: "20240102_failing", up };

    await expect(runMigrations([migration])).rejects.toThrow("index creation failed");

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { name: "20240102_failing" },
      expect.objectContaining({ status: "failed", error: "index creation failed" }),
      { upsert: true, new: true },
    );
  });

  it("runs migrations in lexicographic order", async () => {
    mockFindOne.mockResolvedValue(null);
    const order: string[] = [];
    const migrations: Migration[] = [
      { name: "20240103_c", up: async () => { order.push("c"); } },
      { name: "20240101_a", up: async () => { order.push("a"); } },
      { name: "20240102_b", up: async () => { order.push("b"); } },
    ];

    await runMigrations(migrations);

    expect(order).toEqual(["a", "b", "c"]);
  });
});
