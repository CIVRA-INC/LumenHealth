export type FemaleotakuIntegrityState = "secure" | "compromised" | "unknown";

export interface FemaleotakuIntegrityResult {
  state: FemaleotakuIntegrityState;
  reason?: "jailbroken" | "rooted" | "debuggable" | "emulator" | "check_failed";
  checkedAtMs: number;
}

export interface FemaleotakuIntegritySignals {
  isJailbroken?: boolean;
  isRooted?: boolean;
  isDebuggable?: boolean;
  isEmulator?: boolean;
}

export type FemaleotakuIntegrityPolicy = "warn" | "block-sensitive" | "block";

export function evaluateFemaleotakuIntegrity(signals: FemaleotakuIntegritySignals, nowMs = Date.now()): FemaleotakuIntegrityResult {
  if (signals.isJailbroken) return { state: "compromised", reason: "jailbroken", checkedAtMs: nowMs };
  if (signals.isRooted) return { state: "compromised", reason: "rooted", checkedAtMs: nowMs };
  if (signals.isDebuggable) return { state: "compromised", reason: "debuggable", checkedAtMs: nowMs };
  if (signals.isEmulator) return { state: "compromised", reason: "emulator", checkedAtMs: nowMs };
  if (Object.keys(signals).length === 0) return { state: "unknown", reason: "check_failed", checkedAtMs: nowMs };
  return { state: "secure", checkedAtMs: nowMs };
}

export function applyFemaleotakuPolicy(
  result: FemaleotakuIntegrityResult,
  policy: FemaleotakuIntegrityPolicy,
): { allowApp: boolean; allowSensitive: boolean; userMessage?: string } {
  if (result.state === "secure") return { allowApp: true, allowSensitive: true };
  const msg = "This device may be compromised. For your safety, some clinical features are restricted.";
  if (policy === "block") return { allowApp: false, allowSensitive: false, userMessage: msg };
  if (policy === "block-sensitive") return { allowApp: true, allowSensitive: false, userMessage: msg };
  return { allowApp: true, allowSensitive: true, userMessage: "Device integrity could not be fully verified." };
}
