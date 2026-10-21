import { beforeEach, describe, expect, it } from "vitest";

import {
  RATE_LIMIT_WINDOW_MS,
  _resetRateLimiter,
  limited,
} from "../rate-limit/rate-limiter.js";

describe("rate limiter (#1301)", () => {
  beforeEach(() => {
    _resetRateLimiter();
  });

  it("allows the first `limit` requests and rejects the next", () => {
    const key = "login:1.2.3.4";
    for (let i = 0; i < 10; i += 1) {
      expect(limited(key, 10)).toBe(false);
    }
    expect(limited(key, 10)).toBe(true);
  });

  it("tracks keys independently", () => {
    const now = Date.now();
    expect(limited("login:a", 1, now)).toBe(false);
    expect(limited("login:a", 1, now)).toBe(true);
    // A different key has its own budget.
    expect(limited("login:b", 1, now)).toBe(false);
  });

  it("resets once the window elapses", () => {
    const start = Date.now();
    expect(limited("login:c", 1, start)).toBe(false);
    expect(limited("login:c", 1, start)).toBe(true);

    const afterWindow = start + RATE_LIMIT_WINDOW_MS;
    expect(limited("login:c", 1, afterWindow)).toBe(false);
  });

  it("_resetRateLimiter clears all counters", () => {
    expect(limited("login:d", 1)).toBe(false);
    expect(limited("login:d", 1)).toBe(true);

    _resetRateLimiter();

    expect(limited("login:d", 1)).toBe(false);
  });
});
