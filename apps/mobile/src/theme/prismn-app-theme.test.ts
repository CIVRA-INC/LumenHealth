import { describe, expect, it } from "vitest";
import { prismnContrastRatio, prismnLightTheme, prismnScaledFontSize } from "./prismn-app-theme";

describe("prismn app theme", () => {
  it("provides spacing, radii and typography scale tokens", () => {
    expect(prismnLightTheme.spacing.md).toBe(16);
    expect(prismnLightTheme.radii.lg).toBe(16);
    expect(prismnLightTheme.typography.body.fontSize).toBe(16);
    expect(prismnLightTheme.typography.display.fontWeight).toBe("700");
  });

  it("scales text up to 200% cap and keeps contrast >= 4.5:1 for key surfaces", () => {
    expect(prismnScaledFontSize(16, 2.5, 2)).toBe(32);
    expect(prismnContrastRatio(prismnLightTheme.colors.text, prismnLightTheme.colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(prismnContrastRatio(prismnLightTheme.colors.onPrimary, prismnLightTheme.colors.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
