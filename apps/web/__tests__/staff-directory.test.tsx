import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthSession, StaffMember } from "@lumen/types";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const mockFetchStaff = vi.fn();
const mockUpdateStaffRole = vi.fn();

vi.mock("../app/staff/api", () => ({
  fetchStaff: (...args: unknown[]) => mockFetchStaff(...args),
  updateStaffRole: (...args: unknown[]) => mockUpdateStaffRole(...args),
}));

let mockSessionValue: AuthSession | null = null;

vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({
    session: mockSessionValue,
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

import { StaffDirectory } from "../app/staff/_components/staff-directory";

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

const staffFixture: StaffMember[] = [
  {
    staffId: "s1",
    clinicId: "c1",
    userId: "owner-1",
    name: "Dr. Owner",
    email: "owner@clinic.test",
    role: "owner",
    status: "active",
    joinedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    staffId: "s2",
    clinicId: "c1",
    userId: "clinician-1",
    name: "Dr. Clinician",
    email: "clinician@clinic.test",
    role: "clinician",
    status: "active",
    joinedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("StaffDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionValue = null;
  });

  it("shows sign-in prompt when no session", () => {
    render(<StaffDirectory />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("shows loading state while fetching", () => {
    mockSessionValue = ownerSession;
    mockFetchStaff.mockReturnValue(new Promise(() => {}));
    render(<StaffDirectory />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no staff exist", async () => {
    mockSessionValue = ownerSession;
    mockFetchStaff.mockResolvedValue([]);
    render(<StaffDirectory />);
    expect(
      await screen.findByText(/no staff members/i),
    ).toBeInTheDocument();
  });

  it("renders staff table with names and roles", async () => {
    mockSessionValue = ownerSession;
    mockFetchStaff.mockResolvedValue(staffFixture);
    render(<StaffDirectory />);
    expect(await screen.findByText("Dr. Owner")).toBeInTheDocument();
    expect(screen.getByText("Dr. Clinician")).toBeInTheDocument();
  });

  it("shows role dropdown for non-self non-owner staff when owner is viewing", async () => {
    mockSessionValue = ownerSession;
    mockFetchStaff.mockResolvedValue(staffFixture);
    render(<StaffDirectory />);
    await screen.findByText("Dr. Owner");
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(1);
  });

  it("hides actions column for clinician role", async () => {
    mockSessionValue = clinicianSession;
    mockFetchStaff.mockResolvedValue(staffFixture);
    render(<StaffDirectory />);
    await screen.findByText("Dr. Owner");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockSessionValue = ownerSession;
    mockFetchStaff.mockRejectedValue(new Error("Network error"));
    render(<StaffDirectory />);
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });
});
