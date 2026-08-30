import { afterEach, describe, expect, it, vi } from "vitest";
import { authLogger } from "../../../shared/logger/index.js";

describe("auth logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it("serializes the auth event with metadata", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    authLogger.info("auth.login.success", {
      userId: "user-1",
      clinicId: "clinic-1",
      requestId: "req-1",
      meta: { source: "test" },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const [line] = spy.mock.calls[0];
    const parsed = JSON.parse(String(line));

    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("auth.login.success");
    expect(parsed.userId).toBe("user-1");
    expect(parsed.clinicId).toBe("clinic-1");
    expect(parsed.requestId).toBe("req-1");
    expect(parsed.meta).toEqual({ source: "test" });
  });

  it("routes error-level logs to console.error and warn to console.warn (issue #1017)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    authLogger.error("auth.token.expired");
    authLogger.warn("auth.login.failure");

    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("redacts sensitive meta fields before emitting (issue #1018)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    authLogger.info("auth.login.success", {
      meta: { ipAddress: "203.0.113.9", token: "secret-token", source: "test" },
    });

    const parsed = JSON.parse(String(spy.mock.calls[0]![0]));
    expect(parsed.meta.ipAddress).toBe("[REDACTED]");
    expect(parsed.meta.token).toBe("[REDACTED]");
    expect(parsed.meta.source).toBe("test");
  });

  it("suppresses levels below LOG_LEVEL (issue #1018)", () => {
    process.env.LOG_LEVEL = "error";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    authLogger.info("auth.login.success");
    authLogger.error("auth.token.expired");

    expect(logSpy).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledTimes(1);
  });
});
