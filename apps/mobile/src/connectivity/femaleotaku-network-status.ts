export type FemaleotakuNetworkState = "online" | "offline" | "unknown";

export interface FemaleotakuConnectivitySnapshot {
  state: FemaleotakuNetworkState;
  lastChangedAtMs: number;
}

export type FemaleotakuUnsubscribe = () => void;

export interface FemaleotakuNetInfoLike {
  addEventListener(listener: (info: { isConnected: boolean | null }) => void): FemaleotakuUnsubscribe;
  fetch(): Promise<{ isConnected: boolean | null }>;
}

export function createFemaleotakuConnectivityStore(initial: FemaleotakuNetworkState = "unknown") {
  let snapshot: FemaleotakuConnectivitySnapshot = { state: initial, lastChangedAtMs: Date.now() };
  const listeners = new Set<(s: FemaleotakuConnectivitySnapshot) => void>();
  const notify = () => listeners.forEach((l) => l(snapshot));
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: (s: FemaleotakuConnectivitySnapshot) => void): FemaleotakuUnsubscribe {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    setState(state: FemaleotakuNetworkState) {
      if (snapshot.state === state) return;
      snapshot = { state, lastChangedAtMs: Date.now() };
      notify();
    },
  };
}

export async function initFemaleotakuConnectivity(
  netInfo: FemaleotakuNetInfoLike,
  store: ReturnType<typeof createFemaleotakuConnectivityStore>,
): Promise<FemaleotakuUnsubscribe> {
  try {
    const info = await netInfo.fetch();
    store.setState(info.isConnected ? "online" : "offline");
  } catch {
    store.setState("unknown");
  }
  return netInfo.addEventListener((info) => {
    if (info.isConnected == null) store.setState("unknown");
    else store.setState(info.isConnected ? "online" : "offline");
  });
}

export function femaleotakuBannerMessage(state: FemaleotakuNetworkState): string | null {
  if (state === "offline") return "No connection. You're viewing cached data where available.";
  if (state === "unknown") return "Connection status unavailable. Some actions may be queued.";
  return null;
}
