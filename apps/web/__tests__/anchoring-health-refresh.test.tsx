import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchoringHealthReport, AuthSession } from "@lumen/types";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

const mockFetchAnchoringHealth = vi.fn();
vi.mock("../app/audit/api", () => ({
  fetchAnchoringHealth: (...args: unknown[]) => mockFetchAnchoringHealth(...args),
}));

const session: AuthSession = { userId: "o", clinicId: "c1", role: "owner", accessToken: "tok" };
vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({ session, setSession: vi.fn(), clearSession: vi.fn() }),
}));

import { AnchoringHealthPanel } from "../app/audit/_components/anchoring-health-panel";

const START = Date.parse("2026-03-31T12:00:00.000Z");

const report: AnchoringHealthReport = {
  lastSuccessfulTickAt: new Date(START - 30_000).toISOString(),
  lastAnchorAt: null,
  consecutiveFailureCount: 0,
  unanchoredCount: 0,
  oldestUnanchoredAgeMs: null,
  pendingPersistCount: 0,
  checkedAt: new Date(START).toISOString(),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  mockFetchAnchoringHealth.mockResolvedValue(report);
});

afterEach(() => vi.useRealTimers());

describe("anchoring health relative times (#1506)", () => {
  it("re-renders relative times every minute without user action", async () => {
    render(<AnchoringHealthPanel />);
    await act(async () => undefined);
    expect(screen.getByText("30s ago")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("1m ago")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(60 * 60_000);
    });
    expect(screen.getByText("1h ago")).toBeInTheDocument();
  });

  it("stops ticking after unmount", async () => {
    const { unmount } = render(<AnchoringHealthPanel />);
    await act(async () => undefined);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
