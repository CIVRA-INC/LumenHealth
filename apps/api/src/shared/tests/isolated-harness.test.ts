import { describe, expect, it } from "vitest";
import { createIsolatedRepositories } from "./harness.js";

describe("isolated harness", () => {
  it("gives each caller independent state", () => {
    const a = createIsolatedRepositories();
    const b = createIsolatedRepositories();
    a.clinics.save({ clinicId: "c1", slug: "c1" } as never);
    expect(a.clinics.findById("c1")).toBeDefined();
    expect(b.clinics.findById("c1")).toBeUndefined();
  });
});
