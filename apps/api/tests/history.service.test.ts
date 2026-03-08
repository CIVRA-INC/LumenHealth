import { describe, expect, it } from "vitest";
import { buildMockHistoryEncounters, toPagination } from "../src/modules/patients/history.service";

describe("patient history helpers", () => {
  it("calculates pagination offsets", () => {
    const pagination = toPagination(3, 5);
    expect(pagination).toEqual({ page: 3, limit: 5, skip: 10 });
  });

  it("returns mock encounters sorted newest to oldest", () => {
    const rows = buildMockHistoryEncounters();
    expect(rows.length).toBe(3);

    const openedTimes = rows.map((row) => new Date(row.openedAt).getTime());
    expect(openedTimes[0]).toBeGreaterThan(openedTimes[1]);
    expect(openedTimes[1]).toBeGreaterThan(openedTimes[2]);
  });
});
