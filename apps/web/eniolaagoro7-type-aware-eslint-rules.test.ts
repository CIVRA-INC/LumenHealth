import { describe, expect, it } from "vitest";
import { eniolaagoro7TypeAwareEslintRules, hasRequiredEniolaagoro7TypeAwareRules } from "./eniolaagoro7-type-aware-eslint-rules.mjs";

describe("eniolaagoro7 type-aware eslint rules", () => {
  it("requires project service and defines required TS rules", () => {
    expect(eniolaagoro7TypeAwareEslintRules.languageOptions.parserOptions.projectService).toBe(true);
    expect(eniolaagoro7TypeAwareEslintRules.rules["@typescript-eslint/no-floating-promises"][0]).toBe("error");
    expect(eniolaagoro7TypeAwareEslintRules.rules["@typescript-eslint/consistent-type-imports"][0]).toBe("error");
  });

  it("detects presence of required rules", () => {
    expect(hasRequiredEniolaagoro7TypeAwareRules(eniolaagoro7TypeAwareEslintRules)).toBe(true);
    expect(hasRequiredEniolaagoro7TypeAwareRules({ rules: {} })).toBe(false);
  });
});
