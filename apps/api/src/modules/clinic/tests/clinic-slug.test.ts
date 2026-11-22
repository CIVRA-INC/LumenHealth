import { describe, expect, it } from "vitest";
import { generateSlug } from "../validators/clinic.validator.js";

describe("generateSlug (#1471)", () => {
  it("normalizes accented latin", () => {
    expect(generateSlug("Clinique Santé")).toBe("clinique-sante");
  });

  it("falls back for non-latin or punctuation-only names", () => {
    expect(generateSlug("!!!", "abc123")).toBe("clinic-abc123");
    expect(generateSlug("عيادة", "xyz")).toBe("clinic-xyz");
  });

  it("collapses and trims hyphens", () => {
    expect(generateSlug("A -- B")).toBe("a-b");
    expect(generateSlug("--A--")).toBe("a");
  });

  it("caps length and does not end with hyphen", () => {
    const slug = generateSlug("a".repeat(200));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});
