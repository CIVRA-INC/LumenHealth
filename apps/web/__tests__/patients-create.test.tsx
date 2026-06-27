import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PatientForm } from "../app/patients/_components/patient-form";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({
    session: {
      userId: "u1",
      clinicId: "clinic_a",
      role: "admin",
      accessToken: "mock-token",
    },
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

type FetchMock = ReturnType<typeof vi.fn>;

function installFetch(impl: () => Promise<Response>): FetchMock {
  const mock = vi.fn(() => impl());
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

const VALID_VALUES = {
  identifier: "MRN-001",
  givenName: "Ada",
  familyName: "Lovelace",
  birthDate: "1815-12-10",
  phone: "+441234567890",
  email: "ada@example.com",
  address: "1 Science Park",
};

describe("PatientForm (create)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all required fields with the correct input types", () => {
    installFetch(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response),
    );
    render(<PatientForm mode="create" onSuccess={() => {}} />);
    expect(screen.getByPlaceholderText("MRN-001")).toHaveAttribute("type", "text");
    expect(screen.getByPlaceholderText("Ada")).toHaveAttribute("type", "text");
    expect(screen.getByPlaceholderText("Lovelace")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/date of birth/i)).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(/^phone/i)).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/^address/i).tagName.toLowerCase()).toBe("textarea");
  });

  it("submits a valid form with POST and bearer auth", async () => {
    installFetch(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            patient: {
              patientId: "p-new",
              clinicId: "clinic_a",
              identifier: VALID_VALUES.identifier,
              givenName: VALID_VALUES.givenName,
              familyName: VALID_VALUES.familyName,
              birthDate: VALID_VALUES.birthDate,
              phone: VALID_VALUES.phone,
              email: VALID_VALUES.email,
              address: VALID_VALUES.address,
              status: "active",
              createdAt: "2025-06-27T00:00:00.000Z",
              updatedAt: "2025-06-27T00:00:00.000Z",
            },
          }),
      } as Response),
    );

    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<PatientForm mode="create" onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText("MRN-001"), VALID_VALUES.identifier);
    await user.type(screen.getByPlaceholderText("Ada"), VALID_VALUES.givenName);
    await user.type(screen.getByPlaceholderText("Lovelace"), VALID_VALUES.familyName);
    await user.type(screen.getByLabelText(/date of birth/i), VALID_VALUES.birthDate);
    await user.type(screen.getByLabelText(/^phone/i), VALID_VALUES.phone);
    await user.type(screen.getByLabelText(/^email/i), VALID_VALUES.email);
    await user.type(screen.getByLabelText(/^address/i), VALID_VALUES.address);
    await user.click(screen.getByRole("button", { name: /create patient/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    const fetchMock = global.fetch as unknown as FetchMock;
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:4000/api/v1/patients");
    expect(init?.method).toBe("POST");
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
    expect(JSON.parse(init?.body as string)).toEqual({
      identifier: VALID_VALUES.identifier,
      givenName: VALID_VALUES.givenName,
      familyName: VALID_VALUES.familyName,
      birthDate: VALID_VALUES.birthDate,
      phone: VALID_VALUES.phone,
      email: VALID_VALUES.email,
      address: VALID_VALUES.address,
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("surfaces an inline field error on empty submit without calling fetch", async () => {
    installFetch(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response),
    );
    const user = userEvent.setup();
    render(<PatientForm mode="create" onSuccess={() => {}} />);
    await user.click(screen.getByRole("button", { name: /create patient/i }));

    await waitFor(() => {
      // The validation message renders in both the field-error span
      // (`.patientFieldError`) and the auth-status detail panel, so
      // use a length-based check instead of `getByText` (which would
      // throw on multiple matches).
      expect(
        screen.getAllByText(/identifier is required/i).length,
      ).toBeGreaterThan(0);
    });
    expect(global.fetch as unknown as FetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the identifier-taken copy on a 409 response", async () => {
    installFetch(() =>
      Promise.resolve({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            error: "PATIENT_IDENTIFIER_TAKEN",
            message: "duplicate mrn",
          }),
      } as Response),
    );

    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<PatientForm mode="create" onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText("MRN-001"), VALID_VALUES.identifier);
    await user.type(screen.getByPlaceholderText("Ada"), VALID_VALUES.givenName);
    await user.type(screen.getByPlaceholderText("Lovelace"), VALID_VALUES.familyName);
    await user.type(screen.getByLabelText(/date of birth/i), VALID_VALUES.birthDate);
    await user.type(screen.getByLabelText(/^phone/i), VALID_VALUES.phone);
    await user.type(screen.getByLabelText(/^email/i), VALID_VALUES.email);
    await user.type(screen.getByLabelText(/^address/i), VALID_VALUES.address);
    await user.click(screen.getByRole("button", { name: /create patient/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/already in use for this clinic/i),
      ).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
