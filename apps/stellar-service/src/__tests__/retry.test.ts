import { describe, expect, it, vi } from "vitest";
import { withRetry } from "../retry.js";

function fakeSleep() {
  const calls: number[] = [];
  const sleep = vi.fn(async (ms: number) => {
    calls.push(ms);
  });
  return { sleep, calls };
}

describe("withRetry", () => {
  it("returns the result on the first successful attempt without sleeping", async () => {
    const { sleep, calls } = fakeSleep();
    const fn = vi.fn(async () => "ok");

    const result = await withRetry(fn, { sleep });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
  });

  it("retries on failure and succeeds once the underlying call recovers", async () => {
    const { sleep } = fakeSleep();
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error("transient");
      return "recovered";
    });

    const result = await withRetry(fn, { sleep, maxAttempts: 5 });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error once maxAttempts is exhausted", async () => {
    const { sleep } = fakeSleep();
    const fn = vi.fn(async () => {
      throw new Error("always fails");
    });

    await expect(withRetry(fn, { sleep, maxAttempts: 3 })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("applies exponential backoff between attempts", async () => {
    const { sleep, calls } = fakeSleep();
    const fn = vi.fn(async () => {
      throw new Error("fails");
    });

    await expect(
      withRetry(fn, { sleep, maxAttempts: 4, baseDelayMs: 100, factor: 2 }),
    ).rejects.toThrow();

    expect(calls).toEqual([100, 200, 400]);
  });

  it("stops immediately without retrying when isRetryable returns false", async () => {
    const { sleep } = fakeSleep();
    const fn = vi.fn(async () => {
      throw new Error("fatal, not transient");
    });

    await expect(
      withRetry(fn, { sleep, maxAttempts: 5, isRetryable: () => false }),
    ).rejects.toThrow("fatal, not transient");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("defaults to 3 attempts when maxAttempts isn't specified", async () => {
    const { sleep } = fakeSleep();
    const fn = vi.fn(async () => {
      throw new Error("fails");
    });

    await expect(withRetry(fn, { sleep })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
