import { describe, expect, it } from "vitest";
import { buildAuditLogFilters } from "../src/modules/audit/audit.service";

describe("buildAuditLogFilters", () => {
  it("always scopes filters to clinicId", () => {
    const filters = buildAuditLogFilters("clinic-123", {
      page: 1,
      limit: 20,
    });

    expect(filters).toMatchObject({
      clinicId: "clinic-123",
    });
  });

  it("adds user, action, and timestamp range filters when provided", () => {
    const filters = buildAuditLogFilters("clinic-999", {
      page: 2,
      limit: 10,
      userId: "user-abc",
      action: "UPDATE",
      startDate: "2026-03-01T00:00:00.000Z",
      endDate: "2026-03-05T23:59:59.000Z",
    });

    expect(filters).toMatchObject({
      clinicId: "clinic-999",
      userId: "user-abc",
      action: "UPDATE",
    });
    expect(filters.timestamp).toMatchObject({
      $gte: new Date("2026-03-01T00:00:00.000Z"),
      $lte: new Date("2026-03-05T23:59:59.000Z"),
    });
  });
});
