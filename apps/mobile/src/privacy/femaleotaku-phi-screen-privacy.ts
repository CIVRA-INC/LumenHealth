export type FemaleotakuPrivacyCapability = {
  setTaskSwitcherBlur(enabled: boolean): Promise<void> | void;
  setScreenshotBlocking(enabled: boolean): Promise<void> | void;
};

export interface FemaleotakuPhiRoutePolicy {
  routeName: string;
  containsPhi: boolean;
}

export function isPhiRoute(routeName: string, policies: FemaleotakuPhiRoutePolicy[]): boolean {
  const p = policies.find((r) => r.routeName === routeName);
  return p ? p.containsPhi : false;
}

export async function applyFemaleotakuPhiPrivacy(
  routeName: string,
  policies: FemaleotakuPhiRoutePolicy[],
  capability: FemaleotakuPrivacyCapability,
): Promise<{ blurred: boolean; screenshotsBlocked: boolean }> {
  const sensitive = isPhiRoute(routeName, policies);
  await capability.setTaskSwitcherBlur(sensitive);
  await capability.setScreenshotBlocking(sensitive);
  return { blurred: sensitive, screenshotsBlocked: sensitive };
}

export const DEFAULT_FEMALEOTAKU_PHI_POLICIES: FemaleotakuPhiRoutePolicy[] = [
  { routeName: "PatientChart", containsPhi: true },
  { routeName: "Encounter", containsPhi: true },
  { routeName: "Vitals", containsPhi: true },
  { routeName: "PatientList", containsPhi: true },
  { routeName: "Login", containsPhi: false },
  { routeName: "Settings", containsPhi: false },
];
