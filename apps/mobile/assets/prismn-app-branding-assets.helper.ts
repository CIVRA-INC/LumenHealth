export interface PrismnAssetSpec {
  name: string;
  path: string;
  width: number;
  height: number;
  purpose: string;
  variants?: string[];
}

export const PRISMN_REQUIRED_APP_ASSETS: PrismnAssetSpec[] = [
  { name: "icon", path: "apps/mobile/assets/icon.png", width: 1024, height: 1024, purpose: "iOS/Android app icon source" },
  { name: "adaptive-foreground", path: "apps/mobile/assets/adaptive-icon-foreground.png", width: 1024, height: 1024, purpose: "Android adaptive icon foreground" },
  { name: "adaptive-background", path: "apps/mobile/assets/adaptive-icon-background.png", width: 1024, height: 1024, purpose: "Android adaptive icon background" },
  { name: "adaptive-monochrome", path: "apps/mobile/assets/adaptive-icon-monochrome.png", width: 1024, height: 1024, purpose: "Android themed/monochrome icon" },
  { name: "splash", path: "apps/mobile/assets/splash.png", width: 1284, height: 2778, purpose: "Launch splash image", variants: ["light", "dark"] },
];

export interface PrismnBrandingBuildConfig {
  icon: string;
  splash: { image: string; resizeMode: "contain" | "cover"; backgroundColor: string; dark?: { image: string; backgroundColor: string } };
  android: { adaptiveIcon: { foregroundImage: string; backgroundImage: string; monochromeImage: string } };
}

export function getPrismnBrandingBuildConfig(): PrismnBrandingBuildConfig {
  return {
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF",
      dark: { image: "./assets/splash-dark.png", backgroundColor: "#0B1220" },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon-foreground.png",
        backgroundImage: "./assets/adaptive-icon-background.png",
        monochromeImage: "./assets/adaptive-icon-monochrome.png",
      },
    },
  };
}

export function validateRequiredAssetManifest(specs: PrismnAssetSpec[] = PRISMN_REQUIRED_APP_ASSETS): string[] {
  const errors: string[] = [];
  for (const spec of specs) {
    if (!spec.path.startsWith("apps/mobile/assets/")) errors.push(`${spec.name}: path must be under apps/mobile/assets/`);
    if (spec.width <= 0 || spec.height <= 0) errors.push(`${spec.name}: invalid dimensions`);
  }
  return errors;
}
