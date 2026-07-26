import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthSession } from "@lumen/types";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

const mockFetchPatientIdentity = vi.fn();
const mockUpdatePatientIdentity = vi.fn();

vi.mock("../app/patients/identity-api", () => ({
  fetchPatientIdentity: (...args: unknown[]) => mockFetchPatientIdentity(...args),
  updatePatientIdentity: (...args: unknown[]) => mockUpdatePatientIdentity(...args),
}));

let mockSessionValue: AuthSession | null = null;

vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({
    session: mockSessionValue,
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

import { PatientIdentityPanel } from "../app/patients/_components/patient-identity-panel";

const ownerSession: AuthSession = {
  userId: "owner-1",
  clinicId: "c1",
  role: "owner",
  accessToken: "tok",
};

const identityFixture = {
  patientId: "patient_100",
  clinicId: "c1",
  firstName: "Alice",
  lastName: "Chen",
  dateOfBirth: "1988-03-10",
  gender: "female",
  mrn: "MRN-100001",
  phone: "+1-555-0100",
  email: "alice.chen@example.com",
  address: "100 Health Way, Medville, CA 90210",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("PatientIdentityPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionValue = null;
  });

  it("shows sign-in prompt when no session", () => {
    render(<PatientIdentityPanel patientId="patient_100" />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("shows loading state while fetching identity", () => {
    mockSessionValue = ownerSession;
    mockFetchPatientIdentity.mockReturnValue(new Promise(() => {}));
    render(<PatientIdentityPanel patientId="patient_100" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders patient identity fields in view mode", async () => {
    mockSessionValue = ownerSession;
    mockFetchPatientIdentity.mockResolvedValue(identityFixture);
    render(<PatientIdentityPanel patientId="patient_100" />);

    expect(await screen.findByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Chen")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MRN-100001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alice.chen@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+1-555-0100")).toBeInTheDocument();
  });

  it("shows Edit button and switches to edit mode on click", async () => {
    mockSessionValue = ownerSession;
    mockFetchPatientIdentity.mockResolvedValue(identityFixture);
    render(<PatientIdentityPanel patientId="patient_100" />);
    await screen.findByDisplayValue("Alice");

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("validates required fields before submission", async () => {
    mockSessionValue = ownerSession;
    mockFetchPatientIdentity.mockResolvedValue({
      ...identityFixture,
      firstName: "",
    });
    render(<PatientIdentityPanel patientId="patient_100" />);
    await screen.findByRole("button", { name: /edit/i });

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(mockUpdatePatientIdentity).not.toHaveBeenCalled();
  });

  it("validates email format on submission", async () => {
    mockSessionValue = ownerSession;
    mockFetchPatientIdentity.mockResolvedValue(identityFixture);
    render(<PatientIdentityPanel patientId="patient_100" />);
    await screen.findByDisplayValue("Alice");

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    expect(mockUpdatePatientIdentity).not.toHaveBeenCalled();
  });

  it("calls updatePatientIdentity on valid submission", async () => {
    mockSessionValue = ownerSession;
    mockFetchPatientIdentity.mockResolvedValue(identityFixture);
    mockUpdatePatientIdentity.mockResolvedValue({ ...identityFixture, firstName: "Alice" });
    render(<PatientIdentityPanel patientId="patient_100" />);
    await screen.findByDisplayValue("Alice");

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockUpdatePatientIdentity).toHaveBeenCalledWith(
      "patient_100",
      expect.objectContaining({ firstName: "Alice", lastName: "Chen" }),
      "tok",
    );
  });
});
