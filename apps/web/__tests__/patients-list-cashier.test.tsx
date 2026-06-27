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

// Dedicated session mock for cashier role — patient:read is denied for
// cashier per the role matrix in PR #739, so the list API returns 403.
// The "New patient" link must be hidden client-side so the cashier never
// issues a doomed POST. Moved here from patients-list.test.tsx because
// `vi.doMock` after a top-level `vi.mock` cannot re-resolve modules that
// have already been imported.
vi.mock("../app/auth/session-provider", () => ({
  useAuthSession: () => ({
    session: {
      userId: "u-cashier",
      clinicId: "clinic_a",
      role: "cashier",
      accessToken: "mock-token",
    },
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

describe("PatientList — cashier role gate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            error: "AUTH_FORBIDDEN",
            message: "You don't have permission to view patients.",
          }),
      } as Response),
    ) as unknown as typeof fetch;
  });

  it("hides the 'New patient' link when the session role is cashier", async () => {
    render(<PatientList />);
    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: /new patient/i }),
      ).not.toBeInTheDocument();
    });
    // The 403 from the list endpoint renders as friendly copy.
    expect(
      screen.getByText(/you don't have permission to view patients/i),
    ).toBeInTheDocument();
  });
});
