export const workspaceBoundaries = {
  apps: ["apps/api", "apps/web", "apps/mobile", "apps/stellar-service"],
  shared: ["packages/config", "packages/types"],
  allowedSharedImports: ["@lumen/config", "@lumen/types"],
} as const;

export const workspaceBoundarySummary = [
  "Apps may only import shared packages.",
  "Apps must not import other apps.",
  "Shared packages must not import apps.",
];
