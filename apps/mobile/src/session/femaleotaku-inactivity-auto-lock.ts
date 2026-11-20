export type FemaleotakuLockState = "unlocked" | "locked";

export interface FemaleotakuAutoLockConfig {
  timeoutMs: number;
  warnBeforeMs?: number;
  nowMs?: () => number;
}

export interface FemaleotakuAutoLockSnapshot {
  state: FemaleotakuLockState;
  lastActivityMs: number;
  lockedAtMs?: number;
}

export function createFemaleotakuAutoLock(config: FemaleotakuAutoLockConfig) {
  const now = () => (config.nowMs ?? Date.now)();
  let snapshot: FemaleotakuAutoLockSnapshot = { state: "unlocked", lastActivityMs: now() };
  return {
    getSnapshot: () => snapshot,
    markActivity() {
      if (snapshot.state === "unlocked") snapshot = { ...snapshot, lastActivityMs: now() };
    },
    lock() {
      if (snapshot.state === "locked") return;
      snapshot = { ...snapshot, state: "locked", lockedAtMs: now() };
    },
    unlock() {
      snapshot = { state: "unlocked", lastActivityMs: now() };
    },
    checkTimeout(): FemaleotakuAutoLockSnapshot {
      if (snapshot.state === "locked") return snapshot;
      if (now() - snapshot.lastActivityMs >= config.timeoutMs) this.lock();
      return snapshot;
    },
    shouldWarn(): boolean {
      if (snapshot.state === "locked" || !config.warnBeforeMs) return false;
      const remaining = config.timeoutMs - (now() - snapshot.lastActivityMs);
      return remaining <= config.warnBeforeMs && remaining > 0;
    },
  };
}

export function isFemaleotakuSensitiveActionAllowed(snapshot: FemaleotakuAutoLockSnapshot): boolean {
  return snapshot.state === "unlocked";
}
