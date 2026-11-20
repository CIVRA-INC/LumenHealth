import { describe, expect, it } from "vitest";
import {
  KikePatientSearchController,
  canViewPatientList,
  mergePatientPages,
  normalizePatientSearchQuery,
  shouldRunPatientSearch,
  type KikePatientApi,
} from "./kike-patient-list-search";

describe("kike patient list and search helpers", () => {
  it("normalizes and debounces query intent", () => {
    expect(normalizePatientSearchQuery("  Ada   Lovelace ")).toBe("Ada Lovelace");
    expect(shouldRunPatientSearch("  Ada  ")).toEqual({ query: "Ada", debounceMs: 300 });
  });

  it("merges paginated pages without duplicates and gates by permission", () => {
    const merged = mergePatientPages(
      [{ id: "1", clinicId: "c", fullName: "A" }],
      [{ id: "1", clinicId: "c", fullName: "A2" }, { id: "2", clinicId: "c", fullName: "B" }],
    );
    expect(merged.map((p) => p.id)).toEqual(["1", "2"]);
    expect(canViewPatientList(["patient:read"])).toBe(true);
    expect(canViewPatientList(["staff:read"])).toBe(false);
  });

  it("cancels in-flight search requests", async () => {
    const calls: AbortSignal[] = [];
    const api: KikePatientApi = {
      async listPatients(_q, signal) {
        if (signal) calls.push(signal);
        return { items: [], nextCursor: null };
      },
    };
    const controller = new KikePatientSearchController();
    await controller.search(api, { clinicId: "c1", query: "a" });
    controller.cancelInFlight();
    expect(calls[0]?.aborted).toBe(true);
  });
});
