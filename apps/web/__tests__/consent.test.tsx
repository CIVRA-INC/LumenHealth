import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsentPageClient } from "../app/patients/[patientId]/consent/consent-page-client";

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

function mockFetch(
  impl: (url: string, init?: RequestInit) => Promise<Response>,
): void {
  const mock = vi.fn(impl);
  global.fetch = mock as unknown as typeof fetch;
}

describe("ConsentPageClient (consent and privacy UI flow)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays consent records on mount", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            consents: [
              {
                id: "c1",
                patientId: "p1",
                clinicId: "clinic_a",
                type: "data_processing",
                status: "active",
                grantedAt: "2026-06-15T00:00:00.000Z",
                scope: ["treatment", "billing"],
              },
            ],
          }),
      } as Response),
    );

    render(<ConsentPageClient patientId="p1" />);

    await waitFor(() => {
      expect(screen.getByTestId("consent-list")).toBeInTheDocument();
    });
    expect(screen.getByText(/data processing/i)).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it("grants a new consent via POST and refreshes the list", async () => {
    let posted = false;
    mockFetch((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posted = true;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              consent: {
                id: "c2",
                patientId: "p1",
                clinicId: "clinic_a",
                type: "sharing",
                status: "active",
                grantedAt: "2026-06-20T00:00:00.000Z",
                scope: ["all"],
              },
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            consents: posted
              ? [
                  {
                    id: "c2",
                    patientId: "p1",
                    clinicId: "clinic_a",
                    type: "sharing",
                    status: "active",
                    grantedAt: "2026-06-20T00:00:00.000Z",
                    scope: ["all"],
                  },
                ]
              : [],
          }),
      } as Response);
    });

    const user = userEvent.setup();
    render(<ConsentPageClient patientId="p1" />);

    await waitFor(() => {
      expect(screen.getByText(/no consent records/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/share my data/i));
    await user.click(screen.getByRole("button", { name: /grant consent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("consent-list")).toBeInTheDocument();
    });
    expect(screen.getByText(/sharing/i)).toBeInTheDocument();
  });

  it("revokes a consent and updates the UI", async () => {
    let revoked = false;
    mockFetch((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        revoked = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              consent: {
                id: "c1",
                patientId: "p1",
                clinicId: "clinic_a",
                type: "data_processing",
                status: "revoked",
                grantedAt: "2026-06-15T00:00:00.000Z",
                revokedAt: "2026-06-20T00:00:00.000Z",
                scope: ["treatment"],
              },
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            consents: revoked
              ? [
                  {
                    id: "c1",
                    patientId: "p1",
                    clinicId: "clinic_a",
                    type: "data_processing",
                    status: "revoked",
                    grantedAt: "2026-06-15T00:00:00.000Z",
                    revokedAt: "2026-06-20T00:00:00.000Z",
                    scope: ["treatment"],
                  },
                ]
              : [
                  {
                    id: "c1",
                    patientId: "p1",
                    clinicId: "clinic_a",
                    type: "data_processing",
                    status: "active",
                    grantedAt: "2026-06-15T00:00:00.000Z",
                    scope: ["treatment"],
                  },
                ],
          }),
      } as Response);
    });

    const user = userEvent.setup();
    render(<ConsentPageClient patientId="p1" />);

    await waitFor(() => {
      expect(screen.getByText(/revoke/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /revoke/i }));

    await waitFor(() => {
      expect(screen.getByTestId("consent-c1")).toBeInTheDocument();
    });
    expect(screen.getByText("revoked")).toBeInTheDocument();
  });

  it("shows empty state when no consents exist", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ consents: [] }),
      } as Response),
    );

    render(<ConsentPageClient patientId="p1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/no consent records found/i),
      ).toBeInTheDocument();
    });
  });
});
