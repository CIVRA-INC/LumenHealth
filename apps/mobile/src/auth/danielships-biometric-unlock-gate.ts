export type DanielshipsBiometricResult = "success" | "cancelled" | "failed" | "unavailable";

export interface DanielshipsBiometricAdapter {
  isAvailable(): Promise<boolean>;
  authenticate(prompt: string): Promise<DanielshipsBiometricResult>;
}

export interface DanielshipsUnlockState {
  locked: boolean;
  lastUnlockAtMs?: number;
}

export async function attemptDanielshipsBiometricUnlock(
  adapter: DanielshipsBiometricAdapter,
  prompt = "Unlock LumenHealth",
): Promise<{ state: DanielshipsUnlockState; result: DanielshipsBiometricResult }> {
  const available = await adapter.isAvailable();
  if (!available) return { state: { locked: true }, result: "unavailable" };
  const result = await adapter.authenticate(prompt);
  if (result === "success") return { state: { locked: false, lastUnlockAtMs: Date.now() }, result };
  return { state: { locked: true }, result };
}

export function shouldGateOnResume(backgroundedAtMs: number | null, resumeAtMs: number, minBackgroundMs = 0): boolean {
  if (backgroundedAtMs == null) return true;
  return resumeAtMs - backgroundedAtMs >= minBackgroundMs;
}
