import { describe, expect, it, vi } from "vitest";
import type { AuditEntry, AuditExportBundle } from "@lumen/types";
import type { Response } from "express";
import { HttpException } from "@nestjs/common";
import { AuditController } from "../controllers/audit.controller.js";
import type { AuditService } from "../services/audit.service.js";
import type { StellarVerifierClient } from "../services/stellar-verifier.client.js";
import {
  DEFAULT_VERIFY_EXPORT_PROTECTION,
  RootCache,
  SlidingWindowRateLimiter,
  VerificationBudgetExceededError,
  VerificationConcurrency,
  extractTxHashes,
  planVerifyExport,
  verifyExportProtection,
  withTimeBudget,
} from "../services/verify-export.protection.js";

/**
 * Abuse protection for the public /audit/verify-export endpoint (#1336):
 * per-IP rate limiting, distinct-transaction cap (the per-request Horizon
 * bound), concurrency gate, time budget, and cross-request root caching.
 */

function entry(stellarTxHash?: string): AuditEntry {
  return {
    auditId: `audit-${stellarTxHash ?? "unanchored"}`,
    clinicId: "c1",
    action: "staff.role_changed",
    actorId: "u1",
    actorRole: "owner",
    targetType: "staff",
    targetId: "t1",
    sha256Hash: "abcdef0123456789",
    createdAt: "2026-01-01T00:00:00.000Z",
    merkleRoot: "root",
    anchoredAt: "2026-01-01T00:01:00.000Z",
    ...(stellarTxHash !== undefined && { stellarTxHash }),
  } as AuditEntry;
}

function bundle(txHashes: string[], extraUnanchored = 0): AuditExportBundle {
  return {
    signature: "sig",
    signingPublicKey: "GABC",
    manifest: { clinicId: "c1", entriesDigest: "digest" },
    entries: [
      ...txHashes.map((h) => entry(h)),
      ...Array.from({ length: extraUnanchored }, () => entry()),
    ],
  } as AuditExportBundle;
}

function hashes(count: number, prefix = "tx"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

function smallConfig() {
  return {
    ...DEFAULT_VERIFY_EXPORT_PROTECTION,
    requestsPerWindowPerIp: 3,
    maxBundleEntries: 5,
    maxDistinctTxPerRequest: 4,
    maxConcurrentVerifications: 2,
    timeBudgetMs: 500,
    rootCacheMaxEntries: 3,
    rootCacheTtlMs: 1_000,
  };
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(HttpException);
  return (error as HttpException).getStatus();
}

function fakeResponse() {
  return { json: (value: unknown) => value } as unknown as Response;
}

describe("per-IP sliding-window rate limiter", () => {
  it("allows up to the limit per window, then 429s with a retry delay", () => {
    const limiter = new SlidingWindowRateLimiter(3, 60_000);
    expect(limiter.consume("ip-a", 1_000).allowed).toBe(true);
    expect(limiter.consume("ip-a", 2_000).allowed).toBe(true);
    expect(limiter.consume("ip-a", 3_000).allowed).toBe(true);
    const denied = limiter.consume("ip-a", 4_000);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it("keys are independent and the window slides", () => {
    const limiter = new SlidingWindowRateLimiter(1, 1_000);
    expect(limiter.consume("ip-a", 0).allowed).toBe(true);
    expect(limiter.consume("ip-b", 0).allowed).toBe(true);
    expect(limiter.consume("ip-a", 1).allowed).toBe(false);
    // after the window passes, ip-a's oldest hit has expired
    expect(limiter.consume("ip-a", 1_001).allowed).toBe(true);
  });
});

describe("on-chain root cache", () => {
  it("remembers hashes with TTL and evicts LRU-style beyond capacity", () => {
    const cache = new RootCache(3, 1_000);
    cache.remember(["a", "b"], 1_000);
    expect(cache.hasFresh("a", 1_500)).toBe(true);
    expect(cache.hasFresh("a", 3_000)).toBe(false); // TTL expiry
    cache.remember(["c", "d", "e"], 3_100);
    expect(cache.hasFresh("b", 3_200)).toBe(false); // evicted (oldest)
    expect(cache.hasFresh("e", 3_200)).toBe(true);
  });
});

describe("verification concurrency gate", () => {
  it("caps in-flight work and frees slots on release", () => {
    const gate = new VerificationConcurrency(2);
    expect(gate.tryAcquire()).toBe(true);
    expect(gate.tryAcquire()).toBe(true);
    expect(gate.tryAcquire()).toBe(false);
    gate.release();
    expect(gate.tryAcquire()).toBe(true);
  });
});

describe("verification time budget", () => {
  it("passes fast work through", async () => {
    await expect(withTimeBudget(Promise.resolve("done"), 500)).resolves.toBe("done");
  });

  it("rejects slow work with the budget error", async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 500));
    const started = performance.now();
    await expect(withTimeBudget(slow, 20)).rejects.toBeInstanceOf(VerificationBudgetExceededError);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});

describe("per-request work plan (Horizon-call bound)", () => {
  it("counts distinct hashes once and reports uncached lookups", () => {
    const cfg = smallConfig();
    const cache = new RootCache(cfg.rootCacheMaxEntries, cfg.rootCacheTtlMs);
    const b = bundle(["t1", "t1", "t2", "t3"]);
    const plan = planVerifyExport(b, cache, cfg);
    expect(plan.allowed).toBe(true);
    expect(plan.distinctTxHashes).toBe(3);
    expect(plan.uncachedTxHashes).toBe(3);
    expect(extractTxHashes(b)).toEqual(["t1", "t2", "t3"]);
  });

  it("rejects bundles above the distinct-transaction cap with 413 semantics", () => {
    const cfg = smallConfig();
    const cache = new RootCache(cfg.rootCacheMaxEntries, cfg.rootCacheTtlMs);
    const plan = planVerifyExport(bundle(hashes(5)), cache, cfg);
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toContain("distinct transactions");
  });

  it("rejects bundles above the entry cap", () => {
    const cfg = smallConfig();
    const cache = new RootCache(cfg.rootCacheMaxEntries, cfg.rootCacheTtlMs);
    const plan = planVerifyExport(bundle([], 6), cache, cfg);
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toContain("entries");
  });

  it("warming the cache drops repeat requests to zero uncached lookups", () => {
    const cfg = smallConfig();
    const cache = new RootCache(cfg.rootCacheMaxEntries, cfg.rootCacheTtlMs);
    const b = bundle(["t1", "t2"]);
    cache.remember(extractTxHashes(b), 1_000);
    const plan = planVerifyExport(b, cache, cfg, 2_000);
    expect(plan.allowed).toBe(true);
    expect(plan.cachedTxHashes).toBe(2);
    expect(plan.uncachedTxHashes).toBe(0);
  });
});

describe("controller wiring (AuditController.verifyExport)", () => {
  function makeController(delayMs = 0, onChainCalls = { count: 0 }) {
    const client = {
      verifyExportBundleRemote: vi.fn(async () => {
        onChainCalls.count += 1;
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        return { status: "verified" };
      }),
    };
    const controller = new AuditController(
      {} as AuditService,
      client as unknown as StellarVerifierClient
    );
    return { controller, client, onChainCalls };
  }

  it("429s once a caller exceeds the per-IP rate limit", async () => {
    const { controller, client } = makeController();
    const b = bundle(["rate-tx"]);
    let last: Promise<unknown> | undefined;
    for (let i = 0; i <= DEFAULT_VERIFY_EXPORT_PROTECTION.requestsPerWindowPerIp; i++) {
      last = controller.verifyExport(b, "rate-limit-ip", fakeResponse());
      // denied before any upstream call — let earlier ones settle
      await Promise.resolve();
    }
    expect(await statusOf(last as Promise<unknown>)).toBe(429);
    expect(client.verifyExportBundleRemote.mock.calls.length).toBeLessThanOrEqual(
      DEFAULT_VERIFY_EXPORT_PROTECTION.requestsPerWindowPerIp
    );
  });

  it("413s bundles over the distinct-transaction cap without touching stellar-service", async () => {
    const cfg = verifyExportProtection.config;
    const { controller, client } = makeController();
    const err = await controller
      .verifyExport(bundle(hashes(cfg.maxDistinctTxPerRequest + 1)), "plan-ip", fakeResponse())
      .then(
        () => undefined,
        (e: unknown) => e
      );
    expect((err as HttpException).getStatus()).toBe(413);
    expect(client.verifyExportBundleRemote).not.toHaveBeenCalled();
  });

  it("still rejects malformed bodies with 400", async () => {
    const { controller } = makeController();
    expect(await statusOf(controller.verifyExport({ nope: true }, "shape-ip", fakeResponse()))).toBe(400);
  });

  it("429s while the global concurrency gate is saturated, then recovers", async () => {
    const { controller, client } = makeController(150);
    const b = bundle(["busy-tx"]);
    const max = DEFAULT_VERIFY_EXPORT_PROTECTION.maxConcurrentVerifications;
    const inFlight = Array.from({ length: max }, () =>
      controller.verifyExport(b, "busy-ip", fakeResponse())
    );
    const overflow = await statusOf(controller.verifyExport(b, "busy-ip", fakeResponse()));
    expect(overflow).toBe(429);
    const settled = await Promise.all(inFlight);
    expect(settled.every((r) => (r as unknown as { status?: string }).status === "verified")).toBe(true);
    expect(client.verifyExportBundleRemote).toHaveBeenCalledTimes(max);
    // gate freed: next request flows again
    expect(
      await controller.verifyExport(b, "busy-ip-2", fakeResponse())
    ).toEqual({ status: "verified" });
  });

  it("200s a healthy bundle and warms the root cache for repeats", async () => {
    const { controller } = makeController();
    const b = bundle(["warm-1", "warm-2", "warm-2"]);
    const report = await controller.verifyExport(b, "warm-ip", fakeResponse());
    expect(report).toEqual({ status: "verified" });
    const plan = verifyExportProtection.plan(b);
    expect(plan.cachedTxHashes).toBe(2);
    expect(plan.uncachedTxHashes).toBe(0);
  });

  it("maps budget exhaustion to 504", async () => {
    // The 10s default budget is too slow for a unit test; the mapping under
    // test is: a VerificationBudgetExceededError surfacing from the work
    // promise becomes 504 (the race itself is covered in the unit tests above).
    const client = {
      verifyExportBundleRemote: vi.fn(async () => {
        throw new VerificationBudgetExceededError("verification exceeded the 10000ms time budget");
      }),
    };
    const controller = new AuditController(
      {} as AuditService,
      client as unknown as StellarVerifierClient
    );
    const err = await controller
      .verifyExport(bundle(["timeout-tx"]), "timeout-ip", fakeResponse())
      .then(
        () => undefined,
        (e: unknown) => e
      );
    expect((err as HttpException).getStatus()).toBe(504);
    expect((err as HttpException).getResponse()).toMatchObject({ error: "VERIFICATION_BUDGET_EXCEEDED" });
  });
});
