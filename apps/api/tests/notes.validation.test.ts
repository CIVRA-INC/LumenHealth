import { describe, expect, it } from "vitest";
import { createClinicalNoteSchema } from "../src/modules/notes/notes.validation";

describe("createClinicalNoteSchema", () => {
  it("accepts SOAP note payload", () => {
    const parsed = createClinicalNoteSchema.parse({
      encounterId: "mock-enc-123",
      type: "SOAP",
      content: "## Subjective\nHeadache",
    });

    expect(parsed.type).toBe("SOAP");
  });

  it("requires correctionOfNoteId for CORRECTION notes", () => {
    const result = createClinicalNoteSchema.safeParse({
      encounterId: "mock-enc-123",
      type: "CORRECTION",
      content: "Fixing typo",
    });

    expect(result.success).toBe(false);
  });

  it("accepts CORRECTION note with correctionOfNoteId", () => {
    const result = createClinicalNoteSchema.safeParse({
      encounterId: "mock-enc-123",
      type: "CORRECTION",
      content: "Correction note",
      correctionOfNoteId: "507f1f77bcf86cd799439011",
    });

    expect(result.success).toBe(true);
  });
});
