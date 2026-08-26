import { describe, expect, it, vi } from "vitest";
import { AnchoringScheduler } from "../scheduler.js";
import type { AnchoringService } from "../anchoring.js";

function makeFakeAnchoringService(runBatch: ReturnType<typeof vi.fn>) {
  return { runBatch } as unknown as AnchoringService;
}

describe("AnchoringScheduler.start/stop", () => {
  it("schedules tick() on the configured interval and stops cleanly", () => {
    const runBatch = vi.fn(async () => null);
    const service = makeFakeAnchoringService(runBatch);
    const fetchUnanchored = vi.fn(async () => []);

    let scheduledHandler: (() => void) | null = null;
    const setIntervalFn = vi.fn((handler: () => void, _ms: number) => {
      scheduledHandler = handler;
      return 123 as unknown as ReturnType<typeof setInterval>;
    });
    const clearIntervalFn = vi.fn();

    const scheduler = new AnchoringScheduler(service, fetchUnanchored, {
      intervalMs: 5000,
      setIntervalFn,
      clearIntervalFn,
    });

    scheduler.start();

    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 5000);
    expect(scheduler.isRunning).toBe(true);

    scheduler.stop();

    expect(clearIntervalFn).toHaveBeenCalledWith(123);
    expect(scheduler.isRunning).toBe(false);
    void scheduledHandler;
  });

  it("does not schedule a second timer if already running", () => {
    const service = makeFakeAnchoringService(vi.fn(async () => null));
    const setIntervalFn = vi.fn(() => 1 as unknown as ReturnType<typeof setInterval>);

    const scheduler = new AnchoringScheduler(service, vi.fn(async () => []), { setIntervalFn });

    scheduler.start();
    scheduler.start();

    expect(setIntervalFn).toHaveBeenCalledTimes(1);
  });

  it("stop() is a no-op when not running", () => {
    const service = makeFakeAnchoringService(vi.fn(async () => null));
    const clearIntervalFn = vi.fn();
    const scheduler = new AnchoringScheduler(service, vi.fn(async () => []), { clearIntervalFn });

    expect(() => scheduler.stop()).not.toThrow();
    expect(clearIntervalFn).not.toHaveBeenCalled();
  });
});

describe("AnchoringScheduler.tick", () => {
  it("runs a batch and never throws, even when runBatch rejects", async () => {
    const runBatch = vi.fn(async () => {
      throw new Error("horizon down");
    });
    const onBatchError = vi.fn();
    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), vi.fn(async () => []), {
      onBatchError,
    });

    await expect(scheduler.tick()).resolves.toBeUndefined();
    expect(onBatchError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("runs reconcile() after the batch attempt", async () => {
    const runBatch = vi.fn(async () => null);
    const fetchUnanchored = vi.fn(async () => []);
    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), fetchUnanchored);

    await scheduler.tick();

    expect(fetchUnanchored).toHaveBeenCalled();
  });

  it("skips a tick entirely if the previous one is still running", async () => {
    // Simulates the interval firing again before a slow tick (e.g. Horizon
    // latency) has finished — AnchoringService's own queue would still
    // keep submissions safe, but the scheduler shouldn't pile up redundant
    // fetch/build work behind it.
    let resolveFirstRunBatch!: () => void;
    const gate = new Promise<void>((resolve) => {
      resolveFirstRunBatch = resolve;
    });
    const runBatch = vi.fn(async () => {
      await gate;
      return null;
    });
    const fetchUnanchored = vi.fn(async () => []);
    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), fetchUnanchored);

    const firstTick = scheduler.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(scheduler.isTicking).toBe(true);

    const secondTick = scheduler.tick(); // should be a no-op, not queued work

    resolveFirstRunBatch();
    await Promise.all([firstTick, secondTick]);

    expect(runBatch).toHaveBeenCalledTimes(1);
    expect(scheduler.isTicking).toBe(false);
  });

  it("allows a new tick once the previous one has finished", async () => {
    const runBatch = vi.fn(async () => null);
    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), vi.fn(async () => []));

    await scheduler.tick();
    await scheduler.tick();

    expect(runBatch).toHaveBeenCalledTimes(2);
  });
});

describe("AnchoringScheduler.reconcile", () => {
  it("does nothing when there are no unanchored entries", async () => {
    const runBatch = vi.fn(async () => null);
    const fetchUnanchored = vi.fn(async () => []);
    const onReconcileStale = vi.fn();
    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), fetchUnanchored, {
      onReconcileStale,
    });

    await scheduler.reconcile();

    expect(onReconcileStale).not.toHaveBeenCalled();
    expect(runBatch).not.toHaveBeenCalled();
  });

  it("does not treat a freshly-unanchored entry as stuck", async () => {
    const now = () => Date.parse("2026-01-01T00:05:00.000Z");
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: "h1", createdAt: "2026-01-01T00:04:50.000Z" },
    ]);
    const runBatch = vi.fn(async () => null);
    const onReconcileStale = vi.fn();

    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), fetchUnanchored, {
      reconcileStaleThresholdMs: 15 * 60_000,
      now,
      onReconcileStale,
    });

    await scheduler.reconcile();

    expect(onReconcileStale).not.toHaveBeenCalled();
    expect(runBatch).not.toHaveBeenCalled();
  });

  it("reports and forces an extra batch attempt when the oldest entry is past the staleness threshold", async () => {
    const now = () => Date.parse("2026-01-01T01:00:00.000Z");
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: "h1", createdAt: "2026-01-01T00:00:00.000Z" }, // 1h old
      { auditId: "a-2", sha256Hash: "h2", createdAt: "2026-01-01T00:50:00.000Z" }, // 10m old
    ]);
    const runBatch = vi.fn(async () => null);
    const onReconcileStale = vi.fn();

    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), fetchUnanchored, {
      reconcileStaleThresholdMs: 15 * 60_000,
      now,
      onReconcileStale,
    });

    await scheduler.reconcile();

    expect(onReconcileStale).toHaveBeenCalledWith({ count: 2, oldestAgeMs: 60 * 60_000 });
    expect(runBatch).toHaveBeenCalledTimes(1);
  });

  it("swallows a failure to even list unanchored entries, without throwing", async () => {
    const fetchUnanchored = vi.fn(async () => {
      throw new Error("apps/api unreachable");
    });
    const runBatch = vi.fn(async () => null);
    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), fetchUnanchored);

    await expect(scheduler.reconcile()).resolves.toBeUndefined();
    expect(runBatch).not.toHaveBeenCalled();
  });

  it("does not throw when the forced reconciliation batch attempt itself fails", async () => {
    const now = () => Date.parse("2026-01-01T01:00:00.000Z");
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: "h1", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const runBatch = vi.fn(async () => {
      throw new Error("still down");
    });
    const onBatchError = vi.fn();

    const scheduler = new AnchoringScheduler(makeFakeAnchoringService(runBatch), fetchUnanchored, {
      reconcileStaleThresholdMs: 15 * 60_000,
      now,
      onBatchError,
    });

    await expect(scheduler.reconcile()).resolves.toBeUndefined();
    expect(onBatchError).toHaveBeenCalledWith(expect.any(Error));
  });
});
