import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthSession } from "@lumen/types";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSession: AuthSession = {
  userId: "u1",
  clinicId: "c1",
  role: "owner",
  accessToken: "tok",
};

const mockFetchClinic = vi.fn();
const mockUpdateClinic = vi.fn();

vi.mock("../app/clinic/api", () => ({
  fetchClinic: (...args: unknown[]) => mockFetchClinic(...args),
  updateClinic: (...args: unknown[]) => mockUpdateClinic(...args),
}));

let mockSessionValue: AuthSession | null = null;

vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({
    session: mockSessionValue,
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

import { ClinicSettingsForm } from "../app/clinic/_components/clinic-settings-form";

describe("ClinicSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionValue = null;
  });

  it("shows sign-in prompt when no session", () => {
    mockSessionValue = null;
    render(<ClinicSettingsForm />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("shows loading state while fetching clinic", () => {
    mockSessionValue = mockSession;
    mockFetchClinic.mockReturnValue(new Promise(() => {}));
    render(<ClinicSettingsForm />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders form fields after clinic loads", async () => {
    mockSessionValue = mockSession;
    mockFetchClinic.mockResolvedValue({
      clinicId: "c1",
      name: "Test Clinic",
      address: "123 Main",
      phone: "555-1234",
      email: "test@clinic.com",
      slug: "test-clinic",
      status: "active",
      ownerId: "u1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<ClinicSettingsForm />);

    const nameInput = await screen.findByDisplayValue("Test Clinic");
    expect(nameInput).toBeInTheDocument();
    expect(screen.getByDisplayValue("123 Main")).toBeInTheDocument();
    expect(screen.getByDisplayValue("555-1234")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test@clinic.com")).toBeInTheDocument();
  });

  it("renders the save button for owners", async () => {
    mockSessionValue = mockSession;
    mockFetchClinic.mockResolvedValue({
      clinicId: "c1",
      name: "Test Clinic",
      address: "123 Main",
      phone: "555-1234",
      email: "test@clinic.com",
      slug: "test-clinic",
      status: "active",
      ownerId: "u1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<ClinicSettingsForm />);
    await screen.findByDisplayValue("Test Clinic");
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("disables inputs for clinician role", async () => {
    mockSessionValue = { ...mockSession, role: "clinician" };
    mockFetchClinic.mockResolvedValue({
      clinicId: "c1",
      name: "Test Clinic",
      address: "123 Main",
      phone: "555-1234",
      email: "test@clinic.com",
      slug: "test-clinic",
      status: "active",
      ownerId: "u1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<ClinicSettingsForm />);
    const nameInput = await screen.findByDisplayValue("Test Clinic");
    expect(nameInput).toBeDisabled();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });
});
