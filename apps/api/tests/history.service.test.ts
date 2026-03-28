import { describe, expect, it } from "vitest";
import { toPagination } from "../src/modules/patients/history.service";

describe("patient history helpers", () => {
  it("calculates pagination offsets", () => {
    const pagination = toPagination(3, 5);
    expect(pagination).toEqual({ page: 3, limit: 5, skip: 10 });
  });

  it("keeps page and limit for empty datasets", () => {
    const pagination = toPagination(1, 10);
    expect(pagination.page).toBe(1);
    expect(pagination.limit).toBe(10);
    expect(pagination.skip).toBe(0);
  });
});
