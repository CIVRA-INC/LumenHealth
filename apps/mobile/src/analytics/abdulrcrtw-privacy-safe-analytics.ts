export type AbdulrcrtwEventName = "screen_view" | "auth_login" | "auth_logout" | "encounter_saved";

export interface AbdulrcrtwAnalyticsEvent {
  name: AbdulrcrtwEventName;
  screen?: string;
  success?: boolean;
  ts: string;
}

const PHI_KEY_PATTERN = /(name|email|phone|dob|birth|mrn|patient|address|note|diagnosis|ssn)/i;

export function stripPhiProps<T extends Record<string, unknown>>(props: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (PHI_KEY_PATTERN.test(k)) continue;
    if (typeof v === "string" && /@/.test(v)) continue;
    out[k] = v;
  }
  return out;
}

export interface AbdulrcrtwConsentState {
  decided: boolean;
  granted: boolean;
}

export function defaultConsentState(): AbdulrcrtwConsentState {
  return { decided: false, granted: false };
}

export function canEmitEvents(consent: AbdulrcrtwConsentState): boolean {
  return consent.decided && consent.granted;
}

export function buildSafeEvent(
  name: AbdulrcrtwEventName,
  props: Record<string, unknown>,
  now = () => new Date().toISOString(),
): AbdulrcrtwAnalyticsEvent {
  const safe = stripPhiProps(props);
  return { name, ts: now(), screen: typeof safe.screen === "string" ? safe.screen : undefined, success: typeof safe.success === "boolean" ? safe.success : undefined };
}
