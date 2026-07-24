import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditEntry, AuditVerifyResponse, AuthSession } from "@lumen/types";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

const mockFetchAuditLog = vi.fn();
const mockVerifyAuditEntry = vi.fn();

vi.mock("../app/audit/api", () => ({
  fetchAuditLog: (...args: unknown[]) => mockFetchAuditLog(...args),
  verifyAuditEntry: (...args: unknown[]) => mockVerifyAuditEntry(...args),
}));

let mockSessionValue: AuthSession | null = null;

vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({
    session: mockSessionValue,
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

import { AuditLog } from "../app/audit/_components/audit-log";

const ownerSession: AuthSession = {
  userId: "owner-1",
  clinicId: "c1",
  role: "owner",
  accessToken: "tok",
};

const clinicianSession: AuthSession = {
  ...ownerSession,
  userId: "clinician-1",
  role: "clinician",
};

const genuineEntry: AuditEntry = {
  auditId: "a-1",
  clinicId: "c1",
  action: "staff.role_changed",
  actorId: "actor-1",
  actorRole: "owner",
  targetId: "staff-1",
  targetType: "staff",
  before: { role: "clinician" },
  after: { role: "admin" },
  createdAt: "2026-01-01T00:00:00.000Z",
  sha256Hash: "hash-1",
  stellarTxHash: "tx-1",
  merkleRoot: "root-1",
  anchoredAt: "2026-01-02T00:00:00.000Z",
  merkleProof: [{ hash: "sibling-1", position: "right" }],
};

const unanchoredEntry: AuditEntry = {
  auditId: "a-2",
  clinicId: "c1",
  action: "staff.invited",
  actorId: "actor-1",
  actorRole: "owner",
  createdAt: "2026-01-03T00:00:00.000Z",
  sha256Hash: "hash-2",
};

const tamperedEntry: AuditEntry = {
  ...genuineEntry,
  auditId: "a-3",
};

function verifiedResponse(auditId: string): AuditVerifyResponse {
  return {
    auditId,
    status: "verified",
    recomputedHash: "hash-1",
    storedHash: "hash-1",
    merkleRoot: "root-1",
    stellarTxHash: "tx-1",
    checkedAt: "2026-01-04T00:00:00.000Z",
  };
}

function unanchoredResponse(auditId: string): AuditVerifyResponse {
  return {
    auditId,
    status: "unanchored",
    recomputedHash: "hash-2",
    storedHash: "hash-2",
    checkedAt: "2026-01-04T00:00:00.000Z",
  };
}

function tamperedResponse(auditId: string): AuditVerifyResponse {
  return {
    auditId,
    status: "tampered",
    recomputedHash: "hash-mismatch",
    storedHash: "hash-1",
    merkleRoot: "root-1",
    stellarTxHash: "tx-1",
    checkedAt: "2026-01-04T00:00:00.000Z",
    reason: "stored content no longer matches its recorded hash",
  };
}

describe("AuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionValue = null;
  });

  it("shows sign-in prompt when no session", () => {
    render(<AuditLog />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("hides the log from non-owner/admin roles", () => {
    mockSessionValue = clinicianSession;
    render(<AuditLog />);
    expect(screen.getByText(/only owners and admins/i)).toBeInTheDocument();
    expect(mockFetchAuditLog).not.toHaveBeenCalled();
  });

  it("shows loading state while fetching", () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockReturnValue(new Promise(() => {}));
    render(<AuditLog />);
    expect(screen.getByText(/loading audit log/i)).toBeInTheDocument();
  });

  it("shows empty state when no entries match", async () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockResolvedValue({ entries: [], total: 0 });
    render(<AuditLog />);
    expect(await screen.findByText(/no audit entries match/i)).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockRejectedValue(new Error("Network error"));
    render(<AuditLog />);
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("renders an 'Anchored & Verified' badge for a verified entry", async () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockResolvedValue({ entries: [genuineEntry], total: 1 });
    mockVerifyAuditEntry.mockResolvedValue(verifiedResponse(genuineEntry.auditId));

    render(<AuditLog />);

    expect(await screen.findByText(/anchored & verified/i)).toBeInTheDocument();
  });

  it("renders a 'Pending Anchor' badge for an unanchored entry", async () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockResolvedValue({ entries: [unanchoredEntry], total: 1 });
    mockVerifyAuditEntry.mockResolvedValue(unanchoredResponse(unanchoredEntry.auditId));

    render(<AuditLog />);

    expect(await screen.findByText(/pending anchor/i)).toBeInTheDocument();
  });

  it("renders an unmissable 'Tampered' badge and highlights the row when content was altered", async () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockResolvedValue({ entries: [tamperedEntry], total: 1 });
    mockVerifyAuditEntry.mockResolvedValue(tamperedResponse(tamperedEntry.auditId));

    render(<AuditLog />);

    const badge = await screen.findByText(/tampered/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("verifyBadge--tampered");

    const row = badge.closest("tr");
    expect(row?.className).toContain("auditRow--tampered");
  });

  it("shows the Merkle proof and Stellar tx link when an entry is selected", async () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockResolvedValue({ entries: [genuineEntry], total: 1 });
    mockVerifyAuditEntry.mockResolvedValue(verifiedResponse(genuineEntry.auditId));

    render(<AuditLog />);
    await screen.findByText(/anchored & verified/i);

    fireEvent.click(screen.getByRole("cell", { name: "staff.role_changed" }));

    expect(await screen.findByText("Chain of custody")).toBeInTheDocument();
    expect(screen.getByText("sibling-1")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /tx-1/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("tx-1"));
  });

  it("shows a reason and no chain data for a tampered entry's detail panel", async () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockResolvedValue({ entries: [tamperedEntry], total: 1 });
    mockVerifyAuditEntry.mockResolvedValue(tamperedResponse(tamperedEntry.auditId));

    render(<AuditLog />);
    await screen.findByText(/tampered/i);

    fireEvent.click(screen.getByRole("cell", { name: "staff.role_changed" }));

    expect(await screen.findByText("Chain of custody")).toBeInTheDocument();
    expect(
      screen.getByText("stored content no longer matches its recorded hash"),
    ).toBeInTheDocument();
  });

  it("applies action/actor/date filters when the form is submitted", async () => {
    mockSessionValue = ownerSession;
    mockFetchAuditLog.mockResolvedValue({ entries: [], total: 0 });
    render(<AuditLog />);
    await screen.findByText(/no audit entries match/i);

    fireEvent.change(screen.getByLabelText(/actor id/i), { target: { value: "actor-9" } });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(mockFetchAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ actorId: "actor-9" }),
      "tok",
    );
  });
});
