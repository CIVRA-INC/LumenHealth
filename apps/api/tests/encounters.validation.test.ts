import { describe, expect, it } from "vitest";
import {
  createEncounterSchema,
  encounterIdParamsSchema,
} from "../src/modules/encounters/encounters.validation";

describe("encounter validation", () => {
  it("accepts create payload with optional patientId", () => {
    const parsed = createEncounterSchema.parse({});
    expect(parsed).toEqual({});
  });

  it("rejects invalid encounter object id in params", () => {
    const result = encounterIdParamsSchema.safeParse({ id: "invalid-id" });
    expect(result.success).toBe(false);
  });

  it("accepts valid encounter object id in params", () => {
    const result = encounterIdParamsSchema.safeParse({
      id: "507f1f77bcf86cd799439011",
    });
    expect(result.success).toBe(true);
  });
});
