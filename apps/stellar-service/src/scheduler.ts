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
  /** Called whenever a scheduled or reconciliation batch attempt throws. Never throws itself. */
  onBatchError?: (error: unknown) => void;
  /** Called when reconciliation finds the queue stuck past the staleness threshold. */
  onReconcileStale?: (info: StaleUnanchoredInfo) => void;
  now?: () => number;
  setIntervalFn?: (handler: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (handle: ReturnType<typeof setInterval>) => void;
};

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_STALE_THRESHOLD_MS = 15 * 60_000;

/**
 * Turns `AnchoringService.runBatch()` from a manual, one-shot CLI action
 * into a persistent, interval-driven job, plus a reconciliation pass that
 * notices when the unanchored queue has been stuck for longer than expected
 * (e.g. every scheduled attempt has been failing) and forces an extra
 * out-of-cycle retry instead of silently waiting for the next tick.
 */
export class AnchoringScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;

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

  /** One scheduled cycle: a batch attempt, then a reconciliation check. Never throws. */
  async tick(): Promise<void> {
    await this.runBatchSafely();
    await this.reconcile();
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

  private async runBatchSafely(): Promise<void> {
    try {
      await this.anchoringService.runBatch();
    } catch (error) {
      this.options.onBatchError?.(error);
    }
  }
}
