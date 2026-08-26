import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnchoringHealthReport, AuthSession } from "@lumen/types";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

const mockFetchAnchoringHealth = vi.fn();

vi.mock("../app/audit/api", () => ({
  fetchAnchoringHealth: (...args: unknown[]) => mockFetchAnchoringHealth(...args),
}));

let mockSessionValue: AuthSession | null = null;

vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({
    session: mockSessionValue,
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

import { AnchoringHealthPanel } from "../app/audit/_components/anchoring-health-panel";

const ownerSession: AuthSession = {
  userId: "owner-1",
  clinicId: "c1",
  role: "owner",
  accessToken: "tok",
};

const clinicianSession: AuthSession = { ...ownerSession, userId: "clinician-1", role: "clinician" };

const healthyReport: AnchoringHealthReport = {
  lastSuccessfulTickAt: new Date().toISOString(),
  lastAnchorAt: new Date().toISOString(),
  consecutiveFailureCount: 0,
  unanchoredCount: 0,
  oldestUnanchoredAgeMs: null,
  pendingPersistCount: 0,
  checkedAt: new Date().toISOString(),
};

const degradedByFailuresReport: AnchoringHealthReport = {
  ...healthyReport,
  consecutiveFailureCount: 4,
};

const degradedByLagReport: AnchoringHealthReport = {
  ...healthyReport,
  oldestUnanchoredAgeMs: 20 * 60_000,
  unanchoredCount: 5,
};

beforeEach(() => {
  mockFetchAnchoringHealth.mockReset();
  mockSessionValue = null;
});

describe("AnchoringHealthPanel", () => {
  it("renders nothing for a clinician (not owner/admin)", () => {
    mockSessionValue = clinicianSession;
    const { container } = render(<AnchoringHealthPanel />);
    expect(container).toBeEmptyDOMElement();
    expect(mockFetchAnchoringHealth).not.toHaveBeenCalled();
  });

  it("renders nothing when there is no session", () => {
    mockSessionValue = null;
    const { container } = render(<AnchoringHealthPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a healthy status for a report under both thresholds", async () => {
    mockSessionValue = ownerSession;
    mockFetchAnchoringHealth.mockResolvedValue(healthyReport);

    render(<AnchoringHealthPanel />);

    expect(await screen.findByText("Healthy")).toBeInTheDocument();
  });

  it("shows a degraded status when consecutive failures are at or past the warning threshold", async () => {
    mockSessionValue = ownerSession;
    mockFetchAnchoringHealth.mockResolvedValue(degradedByFailuresReport);

    render(<AnchoringHealthPanel />);

    expect(await screen.findByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows a degraded status when the oldest unanchored entry is past the lag warning threshold", async () => {
    mockSessionValue = ownerSession;
    mockFetchAnchoringHealth.mockResolvedValue(degradedByLagReport);

    render(<AnchoringHealthPanel />);

    expect(await screen.findByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("20m")).toBeInTheDocument();
  });

  it("shows a not-configured message when the endpoint reports 501", async () => {
    mockSessionValue = ownerSession;
    mockFetchAnchoringHealth.mockRejectedValue(new Error("Failed to fetch anchoring health (501)"));

    render(<AnchoringHealthPanel />);

    expect(await screen.findByText(/doesn.t run the anchoring scheduler/i)).toBeInTheDocument();
  });

  it("shows an error with a retry button for other failures, and retry re-fetches", async () => {
    mockSessionValue = ownerSession;
    mockFetchAnchoringHealth.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    mockFetchAnchoringHealth.mockResolvedValueOnce(healthyReport);

    render(<AnchoringHealthPanel />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/ECONNREFUSED/);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(mockFetchAnchoringHealth).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Healthy")).toBeInTheDocument();
  });

  it("refresh button re-fetches health", async () => {
    mockSessionValue = ownerSession;
    mockFetchAnchoringHealth.mockResolvedValue(healthyReport);

    render(<AnchoringHealthPanel />);
    await screen.findByText("Healthy");

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(mockFetchAnchoringHealth).toHaveBeenCalledTimes(2));
  });
});
