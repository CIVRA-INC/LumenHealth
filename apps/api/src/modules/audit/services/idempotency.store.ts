const TTL_MS = 24 * 60 * 60 * 1000;

const processed = new Map<string, { response: unknown; expiresAt: number }>();

/** Remembers responses by Idempotency-Key so retried deliveries repeat the original answer without side effects. */
export const idempotencyStore = {
  get(key: string): unknown | undefined {
    const hit = processed.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      processed.delete(key);
      return undefined;
    }
    return hit.response;
  },

  set(key: string, response: unknown): void {
    processed.set(key, { response, expiresAt: Date.now() + TTL_MS });
  },

  _reset(): void {
    processed.clear();
  },
};
