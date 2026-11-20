import { describe, expect, it, vi } from "vitest";
import { createFemaleotakuConnectivityStore, femaleotakuBannerMessage, initFemaleotakuConnectivity } from "./femaleotaku-network-status";

describe("femaleotaku network status", () => {
  it("updates store from netinfo and exposes banner messages", async () => {
    const store = createFemaleotakuConnectivityStore("unknown");
    const add = vi.fn(() => () => undefined);
    await initFemaleotakuConnectivity({ fetch: async () => ({ isConnected: false }), addEventListener: add }, store);
    expect(store.getSnapshot().state).toBe("offline");
    expect(femaleotakuBannerMessage("offline")).toContain("No connection");
    expect(femaleotakuBannerMessage("online")).toBeNull();
  });
});
