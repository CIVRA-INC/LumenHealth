import { createHash, randomUUID } from "node:crypto";

export type OneTimeTokenPurpose = "password_reset" | "email_verify";

export type OneTimeTokenRecord = {
  tokenHash: string;
  userId: string;
  purpose: OneTimeTokenPurpose;
  expiresAt: number;
  usedAt?: number;
  meta?: Record<string, string>;
};

/** Maximum unused, unexpired tokens a user may hold per purpose. */
export const MAX_OUTSTANDING_TOKENS = 5;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const store = new Map<string, OneTimeTokenRecord>();

function purgeExpired(now = Date.now()) {
  for (const [key, rec] of store) {
    if (rec.expiresAt <= now || rec.usedAt !== undefined) store.delete(key);
  }
}

export const oneTimeTokens = {
  /** Stores only a hash; returns the raw token. Oldest outstanding tokens are dropped past the cap. */
  issue(userId: string, purpose: OneTimeTokenPurpose, ttlMs: number, meta?: Record<string, string>): string {
    purgeExpired();
    const outstanding = [...store.entries()].filter(([, r]) => r.userId === userId && r.purpose === purpose);
    for (const [key] of outstanding.slice(0, Math.max(0, outstanding.length - MAX_OUTSTANDING_TOKENS + 1))) {
      store.delete(key);
    }
    const token = randomUUID();
    store.set(hash(token), { tokenHash: hash(token), userId, purpose, expiresAt: Date.now() + ttlMs, meta });
    return token;
  },

  /** Returns the record only while it is unused and unexpired. */
  find(token: string, purpose: OneTimeTokenPurpose): OneTimeTokenRecord | undefined {
    const rec = store.get(hash(token));
    if (!rec || rec.purpose !== purpose || rec.usedAt !== undefined || rec.expiresAt <= Date.now()) return undefined;
    return rec;
  },

  /** Single-use: marks the token used and returns it, or undefined if invalid. */
  consume(token: string, purpose: OneTimeTokenPurpose): OneTimeTokenRecord | undefined {
    const rec = this.find(token, purpose);
    if (rec) rec.usedAt = Date.now();
    return rec;
  },

  _reset(): void {
    store.clear();
  },
};
