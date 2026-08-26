import type { AnchoringHealthReport } from "@lumen/types";
import type { AnchoringService, FetchUnanchoredEntries } from "./anchoring.js";

export type StaleUnanchoredInfo = {
  count: number;
  oldestAgeMs: number;
};

export type AnchoringSchedulerOptions = {
  /** How often to run a batch anchor, in ms. Defaults to 60s. */
  intervalMs?: number;
  /**
   * If the oldest currently-unanchored entry is older than this, `reconcile()`
   * treats the queue as stuck and triggers an extra out-of-cycle batch
   * attempt rather than waiting for the next scheduled tick. Defaults to 15
   * minutes.
   */
  reconcileStaleThresholdMs?: number;
  /**
   * Consecutive batch-attempt failures (across both scheduled ticks and
   * reconciliation's forced retry) before `onConsecutiveFailures` fires.
   * Defaults to 3.
   */
  maxConsecutiveFailures?: number;
  /** Called whenever a scheduled or reconciliation batch attempt throws. Never throws itself. */
  onBatchError?: (error: unknown) => void;
  /** Called when reconciliation finds the queue stuck past the staleness threshold. */
  onReconcileStale?: (info: StaleUnanchoredInfo) => void;
  /** Called once the consecutive-failure count reaches `maxConsecutiveFailures`, and again on every failure after that. */
  onConsecutiveFailures?: (count: number) => void;
  now?: () => number;
  setIntervalFn?: (handler: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (handle: ReturnType<typeof setInterval>) => void;
};

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_STALE_THRESHOLD_MS = 15 * 60_000;
const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Turns `AnchoringService.runBatch()` from a manual, one-shot CLI action
 * into a persistent, interval-driven job, plus a reconciliation pass that
 * notices when the unanchored queue has been stuck for longer than expected
 * (e.g. every scheduled attempt has been failing) and forces an extra
 * out-of-cycle retry instead of silently waiting for the next tick.
 */
export class AnchoringScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSuccessfulTickAt: string | null = null;
  private lastAnchorAt: string | null = null;
  private consecutiveFailureCount = 0;
  private ticking = false;

  constructor(
    private readonly anchoringService: AnchoringService,
    private readonly fetchUnanchoredEntries: FetchUnanchoredEntries,
    private readonly options: AnchoringSchedulerOptions = {},
  ) {}

  start(): void {
    if (this.timer) return;
    const intervalMs = this.options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const setIntervalFn = this.options.setIntervalFn ?? setInterval;
    this.timer = setIntervalFn(() => {
      void this.tick();
    }, intervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    const clearIntervalFn = this.options.clearIntervalFn ?? clearInterval;
    clearIntervalFn(this.timer);
    this.timer = null;
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }

  /** Whether a tick is currently in progress. */
  get isTicking(): boolean {
    return this.ticking;
  }

  /**
   * One scheduled cycle: a batch attempt, then a reconciliation check.
   * Never throws. Skips entirely if a previous tick is still running (e.g.
   * a slow Horizon call outlasted the interval) — `AnchoringService` itself
   * already serializes overlapping submissions safely, but skipping here
   * avoids piling up redundant fetch/build work behind that queue.
   */
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.runBatchSafely();
      await this.reconcile();
    } finally {
      this.ticking = false;
    }
  }

  /**
   * Checks how long the oldest unanchored entry has been waiting. If it's
   * past the staleness threshold, reports it via `onReconcileStale` and
   * forces an extra batch attempt immediately, rather than waiting for the
   * next scheduled tick to (maybe) pick it up.
   */
  async reconcile(): Promise<void> {
    const threshold = this.options.reconcileStaleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
    const now = this.options.now ?? Date.now;

    let unanchored;
    try {
      unanchored = await this.fetchUnanchoredEntries();
    } catch (error) {
      // Can't reconcile if we can't even list what's pending — the batch
      // attempt in tick() already surfaced this failure via onBatchError.
      void error;
      return;
    }

    if (unanchored.length === 0) return;

    const oldestCreatedAtMs = unanchored.reduce(
      (min, entry) => Math.min(min, Date.parse(entry.createdAt)),
      Infinity,
    );
    const oldestAgeMs = now() - oldestCreatedAtMs;

    if (oldestAgeMs >= threshold) {
      this.options.onReconcileStale?.({ count: unanchored.length, oldestAgeMs });
      await this.runBatchSafely();
    }
  }

  /**
   * Point-in-time snapshot of the anchoring pipeline's operational health —
   * distinct from any single entry's verification status. Combines this
   * scheduler's in-memory tick history with a live queue-lag check, so it
   * always reflects current reality rather than only what's been observed
   * since the process started.
   */
  async getHealth(): Promise<AnchoringHealthReport> {
    const now = this.options.now ?? Date.now;
    let unanchoredCount = 0;
    let oldestUnanchoredAgeMs: number | null = null;

    try {
      const unanchored = await this.fetchUnanchoredEntries();
      unanchoredCount = unanchored.length;
      if (unanchored.length > 0) {
        const oldestCreatedAtMs = unanchored.reduce(
          (min, entry) => Math.min(min, Date.parse(entry.createdAt)),
          Infinity,
        );
        oldestUnanchoredAgeMs = now() - oldestCreatedAtMs;
      }
    } catch {
      // Live queue-lag check unavailable (e.g. apps/api unreachable) — report
      // what we do know (tick history) rather than failing the whole report.
    }

    return {
      lastSuccessfulTickAt: this.lastSuccessfulTickAt,
      lastAnchorAt: this.lastAnchorAt,
      consecutiveFailureCount: this.consecutiveFailureCount,
      unanchoredCount,
      oldestUnanchoredAgeMs,
      pendingPersistCount: this.anchoringService.pendingPersistCount,
      checkedAt: new Date(now()).toISOString(),
    };
  }

  private async runBatchSafely(): Promise<void> {
    const now = this.options.now ?? Date.now;
    try {
      const result = await this.anchoringService.runBatch();
      this.lastSuccessfulTickAt = new Date(now()).toISOString();
      if (result) {
        this.lastAnchorAt = this.lastSuccessfulTickAt;
      }
      this.consecutiveFailureCount = 0;
    } catch (error) {
      this.consecutiveFailureCount += 1;
      this.options.onBatchError?.(error);

      const maxConsecutiveFailures = this.options.maxConsecutiveFailures ?? DEFAULT_MAX_CONSECUTIVE_FAILURES;
      if (this.consecutiveFailureCount >= maxConsecutiveFailures) {
        this.options.onConsecutiveFailures?.(this.consecutiveFailureCount);
      }
    }
  }
}
