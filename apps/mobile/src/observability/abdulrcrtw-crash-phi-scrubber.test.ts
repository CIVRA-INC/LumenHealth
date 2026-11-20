import { describe, expect, it } from "vitest";
import { scrubCrashContext, scrubErrorForReporting, scrubString } from "./abdulrcrtw-crash-phi-scrubber";

describe("abdulrcrtw crash PHI scrubbing", () => {
  it("redacts emails/ids-like patterns from strings and errors", () => {
    expect(scrubString("contact jane.doe@example.com")).toContain("[REDACTED]");
    const e = scrubErrorForReporting(new Error("fail for jane.doe@example.com"));
    expect(e.message).not.toContain("jane.doe@example.com");
  });

  it("keeps only allowlisted non-PHI context fields", () => {
    const safe = scrubCrashContext({ clinicId: "c1", role: "clinician", patientName: "Jane", note: "x" });
    expect(safe).toEqual({ clinicId: "c1", role: "clinician" });
  });
});
