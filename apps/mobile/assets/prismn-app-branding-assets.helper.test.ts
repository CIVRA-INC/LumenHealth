import { describe, expect, it } from "vitest";
import {
  PRISMN_REQUIRED_APP_ASSETS,
  getPrismnBrandingBuildConfig,
  validateRequiredAssetManifest,
} from "./prismn-app-branding-assets.helper";

describe("prismn app branding assets helper", () => {
  it("defines required icon/adaptive/splash assets and build config", () => {
    const names = PRISMN_REQUIRED_APP_ASSETS.map((a) => a.name);
    expect(names).toContain("icon");
    expect(names).toContain("adaptive-foreground");
    expect(names).toContain("adaptive-monochrome");
    expect(names).toContain("splash");
    const cfg = getPrismnBrandingBuildConfig();
    expect(cfg.android.adaptiveIcon.foregroundImage).toContain("adaptive-icon-foreground");
    expect(cfg.splash.dark?.image).toContain("splash-dark");
  });

  it("validates manifest sizes/paths", () => {
    expect(validateRequiredAssetManifest()).toEqual([]);
    expect(validateRequiredAssetManifest([{ name: "bad", path: "x", width: 0, height: 1, purpose: "x" }]).length).toBeGreaterThan(0);
  });
});
