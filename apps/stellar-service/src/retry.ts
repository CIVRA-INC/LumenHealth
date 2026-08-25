export type RetryOptions = {
  /** Total attempts, including the first — not the number of retries. */
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Multiplier applied to the delay after each failed attempt (exponential backoff). */
  factor?: number;
  /** Return false to fail immediately without retrying this particular error. */
  isRetryable?: (error: unknown) => boolean;
  /** Injectable so tests don't need real timers. */
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 100;
const DEFAULT_FACTOR = 2;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying with exponential backoff on failure. Used around the
 * two flaky steps in the anchoring pipeline — submitting a transaction to
 * Horizon, and persisting the result back to apps/api — so a transient
 * network blip or a Horizon rate limit doesn't require a human to notice
 * and manually re-run the anchor job.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const factor = options.factor ?? DEFAULT_FACTOR;
  const isRetryable = options.isRetryable ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;

      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error;
      }

      const delay = baseDelayMs * factor ** (attempt - 1);
      await sleep(delay);
    }
  }

  // Unreachable — the loop always either returns or throws — but keeps
  // TypeScript satisfied that every path returns/throws.
  throw lastError;
}
