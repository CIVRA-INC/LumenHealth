import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@lumen/types";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

const mockFetchAuditLog = vi.fn();
const mockExportAuditLog = vi.fn();
const mockDownloadJson = vi.fn();

vi.mock("../app/audit/api", () => ({
  fetchAuditLog: (...args: unknown[]) => mockFetchAuditLog(...args),
  verifyAuditEntry: vi.fn(() => new Promise(() => undefined)),
  exportAuditLog: (...args: unknown[]) => mockExportAuditLog(...args),
}));
vi.mock("../lib/download", () => ({ downloadJson: (...args: unknown[]) => mockDownloadJson(...args) }));

const session: AuthSession = { userId: "owner-1", clinicId: "c1", role: "owner", accessToken: "tok" };
vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({ session, setSession: vi.fn(), clearSession: vi.fn() }),
}));

import { AuditLog } from "../app/audit/_components/audit-log";

const bundle = {
  manifest: { clinicId: "c1", generatedAt: "2026-01-05T00:00:00.000Z", range: {}, entryCount: 3, entriesDigest: "d" },
  signature: "s",
  signingPublicKey: "G",
  entries: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchAuditLog.mockResolvedValue({ entries: [], total: 0 });
  mockExportAuditLog.mockResolvedValue(bundle);
});

describe("draft vs applied audit filters (#1502)", () => {
  it("exports the previously applied range when the inputs were edited but not applied", async () => {
    render(<AuditLog />);
    await screen.findByText(/no audit entries match/i);

    // Apply 2026-01-01 → 2026-01-31.
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-01-31" } });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    // Type a different range but do NOT apply it.
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2025-06-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2025-06-30" } });

    fireEvent.click(screen.getByRole("button", { name: /export compliance report/i }));

    await waitFor(() => expect(mockExportAuditLog).toHaveBeenCalled());
    expect(mockExportAuditLog).toHaveBeenCalledWith({ from: "2026-01-01", to: "2026-01-31" }, "tok");
  });

  it("exports with no range before any filter was applied, even if the inputs hold a draft", async () => {
    render(<AuditLog />);
    await screen.findByText(/no audit entries match/i);
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2025-06-01" } });

    fireEvent.click(screen.getByRole("button", { name: /export compliance report/i }));

    await waitFor(() => expect(mockExportAuditLog).toHaveBeenCalled());
    expect(mockExportAuditLog).toHaveBeenCalledWith({ from: undefined, to: undefined }, "tok");
  });

  it("states which filters the export honors and follows the applied range", async () => {
    render(<AuditLog />);
    await screen.findByText(/no audit entries match/i);

    expect(screen.getByTestId("export-scope")).toHaveTextContent(/action and actor filters are not part of exports/i);

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-01" } });
    expect(screen.getByTestId("export-scope")).not.toHaveTextContent("2026-01-01");

    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));
    expect(screen.getByTestId("export-scope")).toHaveTextContent("from 2026-01-01");
  });

  it("loads the table with the draft filters when applied", async () => {
    render(<AuditLog />);
    await screen.findByText(/no audit entries match/i);

    fireEvent.change(screen.getByLabelText(/actor id/i), { target: { value: "actor-9" } });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(mockFetchAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ actorId: "actor-9" }), "tok");
  });
});

describe("useAuditExport through AuditLog (#1503)", () => {
  it("downloads through downloadJson and reports success", async () => {
    render(<AuditLog />);
    await screen.findByText(/no audit entries match/i);

    fireEvent.click(screen.getByRole("button", { name: /export compliance report/i }));

    expect(await screen.findByText(/downloaded 3 entries/i)).toBeInTheDocument();
    expect(mockDownloadJson).toHaveBeenCalledWith("audit-export-c1-2026-01-05.json", bundle);
  });

  it("reports a failed export without downloading", async () => {
    mockExportAuditLog.mockRejectedValue(new Error("Stellar service unavailable"));
    render(<AuditLog />);
    await screen.findByText(/no audit entries match/i);

    fireEvent.click(screen.getByRole("button", { name: /export compliance report/i }));

    expect(await screen.findByText(/stellar service unavailable/i)).toBeInTheDocument();
    expect(mockDownloadJson).not.toHaveBeenCalled();
  });
});
