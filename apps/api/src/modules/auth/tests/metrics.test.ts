import { describe, expect, it } from "vitest";
import { getAuthMetricsSnapshot, incrementMetric } from "../services/metrics.service.js";

describe("auth metrics", () => {
  it("increments counters and returns a defensive snapshot", () => {
    const before = getAuthMetricsSnapshot();
    incrementMetric("auth_login_success_total");
    const after = getAuthMetricsSnapshot();

    expect(after.auth_login_success_total).toBe(before.auth_login_success_total + 1);

    after.auth_login_success_total = 999;
    expect(getAuthMetricsSnapshot().auth_login_success_total).toBe(before.auth_login_success_total + 1);
  });
});
