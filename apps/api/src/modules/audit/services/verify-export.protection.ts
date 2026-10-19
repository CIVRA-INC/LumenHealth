import type { AuditExportBundle, AuditEntry } from "@lumen/types";

/**
 * Abuse protection for the public, unauthenticated `POST /audit/verify-export`
 * endpoint (#1336). The endpoint forwards to stellar-service, which performs
 * one Horizon lookup per distinct transaction in the bundle — without limits
 * that is an amplification vector. This module bounds the work per request
 * and across requests:
 *
 * - per-IP sliding-window rate limiting        → 429 with retry-after
 * - a cap on distinct transactions per bundle  → 413 (also bounds Horizon
 *   calls per request: uncached lookups ≤ distinct ≤ cap)
 * - a global concurrency limit                 → 429 while saturated
 * - a verification time budget                 → 504
 * - an on-chain root cache (TTL + LRU)         → repeat hashes cost 0 lookups
 */

export type VerifyExportProtectionConfig = {
  /** Requests allowed per IP per window. */
  requestsPerWindowPerIp: number;
  /** Sliding window length for the per-IP limiter. */
  rateWindowMs: number;
  /** Max entries in a submitted bundle (413 above). */
  maxBundleEntries: number;
  /** Max distinct transactions per bundle — the per-request Horizon bound (413 above). */
  maxDistinctTxPerRequest: number;
  /** Concurrent in-flight verifications (429 above). */
  maxConcurrentVerifications: number;
  /** Wall-clock budget for one verification (504 above). */
  timeBudgetMs: number;
  rootCacheMaxEntries: number;
  rootCacheTtlMs: number;
};

export const DEFAULT_VERIFY_EXPORT_PROTECTION: VerifyExportProtectionConfig = {
  requestsPerWindowPerIp: 30,
  rateWindowMs: 60_000,
  maxBundleEntries: 500,
  maxDistinctTxPerRequest: 50,
  maxConcurrentVerifications: 4,
  timeBudgetMs: 10_000,
  rootCacheMaxEntries: 1_000,
  rootCacheTtlMs: 5 * 60_000,
};

export type RateVerdict = { allowed: true } | { allowed: false; retryAfterMs: number };

/** In-memory sliding-window limiter (milestone 1: single process). */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  consume(key: string, now: number = Date.now()): RateVerdict {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterMs: Math.max(recent[0] - cutoff, 0) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true };
  }
}

/** TTL + LRU cache of on-chain tx hashes already looked up. */
export class RootCache {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number
  ) {}

  hasFresh(txHash: string, now: number = Date.now()): boolean {
    const at = this.seen.get(txHash);
    if (at === undefined) return false;
    if (now - at > this.ttlMs) {
      this.seen.delete(txHash);
      return false;
    }
    return true;
  }

  remember(txHashes: Iterable<string>, now: number = Date.now()): void {
    for (const hash of txHashes) {
      this.seen.delete(hash); // re-insert = recency order
      this.seen.set(hash, now);
    }
    while (this.seen.size > this.maxEntries) {
      const oldest = this.seen.keys().next();
      if (oldest.done) break;
      this.seen.delete(oldest.value);
    }
  }
}

/** Global concurrency gate for verification work. */
export class VerificationConcurrency {
  private inflight = 0;

  constructor(private readonly max: number) {}

  tryAcquire(): boolean {
    if (this.inflight >= this.max) return false;
    this.inflight += 1;
    return true;
  }

  release(): void {
    this.inflight = Math.max(0, this.inflight - 1);
  }
}

export class VerificationBudgetExceededError extends Error {}

/** Rejects if `work` has not settled within `budgetMs`; never leaks the timer. */
export async function withTimeBudget<T>(work: Promise<T>, budgetMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new VerificationBudgetExceededError(`verification exceeded the ${budgetMs}ms time budget`)),
      budgetMs
    );
  });
  // Pre-handle a late rejection so a budget-aborted verification can never
  // surface as an unhandled rejection.
  void work.catch(() => undefined);
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function extractTxHashes(bundle: AuditExportBundle): string[] {
  const seen = new Set<string>();
  for (const entry of bundle.entries as readonly AuditEntry[]) {
    const hash = entry?.stellarTxHash;
    if (typeof hash === "string" && hash.length > 0) seen.add(hash);
  }
  return [...seen];
}

export type VerifyExportPlan = {
  allowed: boolean;
  reason?: string;
  entryCount: number;
  distinctTxHashes: number;
  cachedTxHashes: number;
  /** On-chain lookups this request may still trigger (≤ maxDistinctTxPerRequest). */
  uncachedTxHashes: number;
};

export function planVerifyExport(
  bundle: AuditExportBundle,
  cache: RootCache,
  cfg: VerifyExportProtectionConfig,
  now: number = Date.now()
): VerifyExportPlan {
  const entryCount = bundle.entries.length;
  const hashes = extractTxHashes(bundle);
  const cachedTxHashes = hashes.filter((h) => cache.hasFresh(h, now)).length;
  const base = {
    entryCount,
    distinctTxHashes: hashes.length,
    cachedTxHashes,
    uncachedTxHashes: hashes.length - cachedTxHashes,
  };

  if (entryCount > cfg.maxBundleEntries) {
    return {
      ...base,
      allowed: false,
      reason: `bundle has ${entryCount} entries; the limit is ${cfg.maxBundleEntries}`,
    };
  }
  if (hashes.length > cfg.maxDistinctTxPerRequest) {
    return {
      ...base,
      allowed: false,
      reason: `bundle references ${hashes.length} distinct transactions; the limit is ${cfg.maxDistinctTxPerRequest}`,
    };
  }
  return { ...base, allowed: true };
}

/** Facade the controller uses; one instance lives in the module. */
export class VerifyExportProtection {
  readonly config: VerifyExportProtectionConfig;
  readonly rateLimiter: SlidingWindowRateLimiter;
  readonly roots: RootCache;
  readonly concurrency: VerificationConcurrency;

  constructor(cfg: VerifyExportProtectionConfig = DEFAULT_VERIFY_EXPORT_PROTECTION) {
    this.config = cfg;
    this.rateLimiter = new SlidingWindowRateLimiter(cfg.requestsPerWindowPerIp, cfg.rateWindowMs);
    this.roots = new RootCache(cfg.rootCacheMaxEntries, cfg.rootCacheTtlMs);
    this.concurrency = new VerificationConcurrency(cfg.maxConcurrentVerifications);
  }

  checkRate(ip: string, now: number = Date.now()): RateVerdict {
    return this.rateLimiter.consume(`verify-export:${ip}`, now);
  }

  plan(bundle: AuditExportBundle, now: number = Date.now()): VerifyExportPlan {
    return planVerifyExport(bundle, this.roots, this.config, now);
  }

  /** Warm the root cache after a successful verification. */
  remember(bundle: AuditExportBundle, now: number = Date.now()): void {
    this.roots.remember(extractTxHashes(bundle), now);
  }
}

export const verifyExportProtection = new VerifyExportProtection();
