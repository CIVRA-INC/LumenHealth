import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditEntry, AuthSession, Clinic, StaffMember } from "@lumen/types";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

const mockFetchStaff = vi.fn();
const mockFetchClinic = vi.fn();
const mockFetchAuditLog = vi.fn();
const mockVerifyAuditEntry = vi.fn();

vi.mock("../app/staff/api", () => ({
  fetchStaff: (...args: unknown[]) => mockFetchStaff(...args),
  updateStaffRole: vi.fn(),
}));
vi.mock("../app/clinic/api", () => ({
  fetchClinic: (...args: unknown[]) => mockFetchClinic(...args),
  updateClinic: vi.fn(),
}));
vi.mock("../app/audit/api", () => ({
  fetchAuditLog: (...args: unknown[]) => mockFetchAuditLog(...args),
  verifyAuditEntry: (...args: unknown[]) => mockVerifyAuditEntry(...args),
  exportAuditLog: vi.fn(),
}));

let mockSessionValue: AuthSession | null = null;
vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({ session: mockSessionValue, setSession: vi.fn(), clearSession: vi.fn() }),
}));

import { AuditLog } from "../app/audit/_components/audit-log";
import { ClinicSettingsForm } from "../app/clinic/_components/clinic-settings-form";
import { StaffDirectory } from "../app/staff/_components/staff-directory";

const session: AuthSession = { userId: "owner-1", clinicId: "c1", role: "owner", accessToken: "tok" };

const entry: AuditEntry = {
  auditId: "a-1",
  clinicId: "c1",
  action: "staff.invited",
  actorId: "actor-1",
  actorRole: "owner",
  createdAt: "2026-01-01T00:00:00.000Z",
  sha256Hash: "h",
};

/** A promise the test resolves by hand, to hold the API "in flight". */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  mockSessionValue = session;
  vi.clearAllMocks();
  mockVerifyAuditEntry.mockReturnValue(new Promise(() => undefined));
});

afterEach(() => {
  mockSessionValue = null;
});

describe("no false empty states while the API is in flight (#1498)", () => {
  it("StaffDirectory shows loading, never the empty message, until the response arrives", async () => {
    const pending = deferred<StaffMember[]>();
    mockFetchStaff.mockReturnValue(pending.promise);

    render(<StaffDirectory />);
    expect(screen.getByText(/loading staff directory/i)).toBeInTheDocument();
    expect(screen.queryByText(/no staff members yet/i)).not.toBeInTheDocument();

    await act(async () => pending.resolve([]));
    expect(await screen.findByText(/no staff members yet/i)).toBeInTheDocument();
  });

  it("AuditLog shows loading, never the empty message, until the response arrives", async () => {
    const pending = deferred<{ entries: AuditEntry[]; total: number }>();
    mockFetchAuditLog.mockReturnValue(pending.promise);

    render(<AuditLog />);
    expect(screen.getByText(/loading audit log/i)).toBeInTheDocument();
    expect(screen.queryByText(/no audit entries match/i)).not.toBeInTheDocument();

    await act(async () => pending.resolve({ entries: [], total: 0 }));
    expect(await screen.findByText(/no audit entries match/i)).toBeInTheDocument();
  });

  it("ClinicSettingsForm shows loading instead of an empty editable form", async () => {
    const pending = deferred<Clinic>();
    mockFetchClinic.mockReturnValue(pending.promise);

    render(<ClinicSettingsForm />);
    expect(screen.getByText(/loading clinic settings/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/clinic name/i)).not.toBeInTheDocument();

    await act(async () =>
      pending.resolve({ clinicId: "c1", name: "North Star", address: "", phone: "", email: "" } as Clinic),
    );
    expect(await screen.findByLabelText(/clinic name/i)).toHaveValue("North Star");
  });

  it("is unchanged when signed out", () => {
    mockSessionValue = null;
    render(<StaffDirectory />);
    expect(screen.getByText(/sign in to view the staff directory/i)).toBeInTheDocument();
  });
});

describe("cancelling in-flight requests (#1499)", () => {
  it("unmounting AuditLog aborts every outstanding verify request", async () => {
    mockFetchAuditLog.mockResolvedValue({ entries: [entry, { ...entry, auditId: "a-2" }], total: 2 });

    const { unmount } = render(<AuditLog />);
    await screen.findByText(/2 total entries/i);

    const signals = mockVerifyAuditEntry.mock.calls.map((call) => (call[2] as { signal: AbortSignal }).signal);
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => !signal.aborted)).toBe(true);

    unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("does not show an AbortError as a user-visible message", async () => {
    mockFetchStaff.mockRejectedValue(new DOMException("aborted", "AbortError"));
    render(<StaffDirectory />);
    await act(async () => undefined);
    expect(screen.queryByText(/abort/i)).not.toBeInTheDocument();
  });

  it("unmounting StaffDirectory aborts its request", async () => {
    mockFetchStaff.mockReturnValue(new Promise(() => undefined));
    const { unmount } = render(<StaffDirectory />);
    const { signal } = mockFetchStaff.mock.calls[0][1] as { signal: AbortSignal };

    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
