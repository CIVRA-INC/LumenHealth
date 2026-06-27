import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PatientList } from "../app/patients/_components/patient-list";

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

describe("PatientList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the heading, table headers, and toolbar", () => {
    installFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ items: [], total: 0, limit: 25, offset: 0 }),
      } as Response),
    );
    render(<PatientList />);
    expect(
      screen.getByRole("heading", { level: 1, name: /patient roster/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("MRN")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("fetches the patient list with the bearer auth header", async () => {
    const fetchMock = installFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              {
                patientId: "p1",
                clinicId: "clinic_a",
                identifier: "MRN-001",
                givenName: "Ada",
                familyName: "Lovelace",
                status: "active",
              },
            ],
            total: 1,
            limit: 25,
            offset: 0,
          }),
      } as Response),
    );
    render(<PatientList />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:4000/api/v1/patients?limit=25&offset=0");
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("renders a row for each fetched patient", async () => {
    installFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              {
                patientId: "p1",
                clinicId: "clinic_a",
                identifier: "MRN-001",
                givenName: "Ada",
                familyName: "Lovelace",
                status: "active",
              },
            ],
            total: 1,
            limit: 25,
            offset: 0,
          }),
      } as Response),
    );
    render(<PatientList />);
    await waitFor(() => {
      expect(screen.getByText("MRN-001")).toBeInTheDocument();
    });
    expect(screen.getByText(/ada/i)).toBeInTheDocument();
    expect(screen.getByText(/lovelace/i)).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows the empty-state copy when the roster is empty", async () => {
    installFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ items: [], total: 0, limit: 25, offset: 0 }),
      } as Response),
    );
    render(<PatientList />);
    await waitFor(() => {
      expect(screen.getByText(/No patients yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/0 patients/i)).toBeInTheDocument();
  });

  it("renders the 'New patient' link for an admin session", async () => {
    installFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ items: [], total: 0, limit: 25, offset: 0 }),
      } as Response),
    );
    render(<PatientList />);
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /new patient/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: /new patient/i }),
    ).toHaveAttribute("href", "/patients/new");
  });

});
