import { describe, expect, it, vi } from "vitest";
import { signOutDanielships } from "./danielships-server-signout";

describe("danielships server sign-out", () => {
  it("calls logout endpoint and clears local session", async () => {
    const clearSession = vi.fn();
    const postLogout = vi.fn(async () => ({ ok: true }));
    const res = await signOutDanielships({ postLogout }, { getAccessToken: () => "tok", clearSession });
    expect(postLogout).toHaveBeenCalledWith("tok");
    expect(clearSession).toHaveBeenCalled();
    expect(res).toEqual({ serverRevoked: true, localCleared: true });
  });

  it("still clears local session when server call fails", async () => {
    const clearSession = vi.fn();
    const res = await signOutDanielships(
      { postLogout: async () => { throw new Error("net"); } },
      { getAccessToken: () => "tok", clearSession },
    );
    expect(clearSession).toHaveBeenCalled();
    expect(res.localCleared).toBe(true);
    expect(res.serverRevoked).toBe(false);
  });
});
