import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_OUTSTANDING_TOKENS, oneTimeTokens } from "../repositories/one-time-token.repository.js";

describe("one-time tokens", () => {
  beforeEach(() => oneTimeTokens._reset());

  it("is single-use", () => {
    const token = oneTimeTokens.issue("u1", "password_reset", 60_000);
    expect(oneTimeTokens.consume(token, "password_reset")?.userId).toBe("u1");
    expect(oneTimeTokens.consume(token, "password_reset")).toBeUndefined();
  });

  it("rejects the wrong purpose and expired tokens", () => {
    vi.useFakeTimers();
    const token = oneTimeTokens.issue("u1", "email_verify", 1_000);
    expect(oneTimeTokens.find(token, "password_reset")).toBeUndefined();
    vi.advanceTimersByTime(2_000);
    expect(oneTimeTokens.find(token, "email_verify")).toBeUndefined();
    vi.useRealTimers();
  });

  it("caps outstanding tokens per user", () => {
    const first = oneTimeTokens.issue("u1", "password_reset", 60_000);
    for (let i = 0; i < MAX_OUTSTANDING_TOKENS; i++) oneTimeTokens.issue("u1", "password_reset", 60_000);
    expect(oneTimeTokens.find(first, "password_reset")).toBeUndefined();
  });
});
