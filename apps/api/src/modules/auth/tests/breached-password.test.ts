import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  BREACHED_PASSWORD_MESSAGE,
  checkPasswordBreached,
  defaultPasswordPolicy,
  validatePassword,
  validatePasswordWithBreaches,
  type FetchLike,
} from "../validators/password.validator.js";
import { getAuthMetricsSnapshot } from "../services/metrics.service.js";

const PASSWORD = "Sup3rSecret!42";

function digest(password: string): string {
  return createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
}

function rangeBodyFor(password: string): { prefix: string; body: string } {
  const d = digest(password);
  const prefix = d.slice(0, 5);
  const suffix = d.slice(5);
  const body = [
    "0000000000000000000000000000000000000:3",
    `${suffix}:42`,
    "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:9",
  ].join("\n");
  return { prefix, body };
}

function okFetch(body: string): FetchLike {
  return async () => ({ ok: true, status: 200, text: async () => body });
}

const throwingFetch: FetchLike = async () => {
  throw new Error("ECONNRESET");
};

const hangingFetch: FetchLike = () => new Promise(() => undefined);

describe("breached-password screening (k-anonymity range check)", () => {
  it("rejects a password whose suffix appears in the range response", async () => {
    const { prefix, body } = rangeBodyFor(PASSWORD);
    const fetchImpl = vi.fn(okFetch(body));
    const before = getAuthMetricsSnapshot().auth_password_breach_rejected_total;

    const outcome = await checkPasswordBreached(PASSWORD, { fetchImpl });

    expect(outcome).toEqual({ breached: true, source: "range-api", degraded: false });
    // Only the 5-char prefix may leave the process.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
    expect(fetchImpl.mock.calls[0][0]).not.toContain(digest(PASSWORD).slice(5));
    expect(getAuthMetricsSnapshot().auth_password_breach_rejected_total).toBe(before + 1);
  });

  it("accepts a password with no suffix match", async () => {
    const { body } = rangeBodyFor(PASSWORD);
    const outcome = await checkPasswordBreached("Unrelated!Pass99", { fetchImpl: okFetch(body) });
    expect(outcome).toEqual({ breached: false, source: "none", degraded: false });
  });

  it("policy failures short-circuit without any network call", async () => {
    const fetchImpl = vi.fn(okFetch(""));
    const message = await validatePasswordWithBreaches("short", defaultPasswordPolicy, { fetchImpl });
    expect(message).toBe("password must be at least 8 characters");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("degrades to the offline corpus when the range API is down", async () => {
    const before = getAuthMetricsSnapshot();
    const outcome = await checkPasswordBreached("password", { fetchImpl: throwingFetch });
    expect(outcome).toEqual({ breached: true, source: "offline-corpus", degraded: true });
    const after = getAuthMetricsSnapshot();
    expect(after.auth_password_breach_check_degraded_total).toBe(
      before.auth_password_breach_check_degraded_total + 1
    );
    expect(after.auth_password_breach_rejected_total).toBe(
      before.auth_password_breach_rejected_total + 1
    );
  });

  it("fails open on outage when the password is not in the offline corpus", async () => {
    const before = getAuthMetricsSnapshot();
    const outcome = await checkPasswordBreached("Corr3ctHorse!Battery", { fetchImpl: throwingFetch });
    // Outage must never block a legitimate reset: no verdict, degraded flag.
    expect(outcome).toEqual({ breached: false, source: "none", degraded: true });
    expect(getAuthMetricsSnapshot().auth_password_breach_check_degraded_total).toBe(
      before.auth_password_breach_check_degraded_total + 1
    );
  });

  it("treats a hung range API as an outage via the timeout", async () => {
    const start = performance.now();
    const outcome = await checkPasswordBreached(PASSWORD, { fetchImpl: hangingFetch, timeoutMs: 30 });
    const elapsed = performance.now() - start;
    expect(outcome).toEqual({ breached: false, source: "none", degraded: true });
    expect(elapsed).toBeLessThan(2000);
  });

  it("treats a non-2xx range response as an outage", async () => {
    const unavailable: FetchLike = async () => ({ ok: false, status: 503, text: async () => "" });
    const outcome = await checkPasswordBreached(PASSWORD, { fetchImpl: unavailable });
    expect(outcome.degraded).toBe(true);
    expect(outcome.breached).toBe(false);
  });

  it("respects an injected offline corpus override", async () => {
    const outcome = await checkPasswordBreached("CustomCorp5!", {
      fetchImpl: throwingFetch,
      offlineCorpus: ["CustomCorp5!"],
    });
    expect(outcome).toEqual({ breached: true, source: "offline-corpus", degraded: true });
  });

  it("validatePasswordWithBreaches surfaces the breach message without echoing the password", async () => {
    const { body } = rangeBodyFor(PASSWORD);
    const message = await validatePasswordWithBreaches(PASSWORD, defaultPasswordPolicy, {
      fetchImpl: okFetch(body),
    });
    expect(message).toBe(BREACHED_PASSWORD_MESSAGE);
    expect(message).not.toContain(PASSWORD);
  });

  it("validatePasswordWithBreaches passes healthy passwords through", async () => {
    const message = await validatePasswordWithBreaches("C0rrectHorse!", defaultPasswordPolicy, {
      fetchImpl: okFetch("0000000000000000000000000000000000000:1"),
    });
    expect(message).toBeNull();
  });

  it("keeps the original sync policy validation intact", () => {
    expect(validatePassword("okpassword")).toBeNull();
    expect(validatePassword("short")).not.toBeNull();
  });
});
