import { describe, expect, it, vi } from "vitest";
import { authLogger } from "../../../shared/logger/index.js";

describe("auth logger", () => {
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

    spy.mockRestore();
  });
});
