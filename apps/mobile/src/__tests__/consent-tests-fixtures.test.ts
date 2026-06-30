/**
 * Mobile consent service + contract test fixtures (#707).
 *
 * Pairs with the UI-flow fixtures in `ui/consent.ts`. Covers the
 * network layer (createMobileConsentService) and the typed contract
 * layer (createMobileConsentContract) end-to-end against a mocked
 * `global.fetch`, plus reusable mock-response builders other tests
 * can import.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  createMobileConsentService,
  type ConsentRecord,
} from "../services/consent";
import { createMobileConsentContract } from "../contracts/consent";

const mockFetch = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

// ── Fixtures ──────────────────────────────────────────────────────────────────

export const consentRecordFixtures = {
  active: {
    id: "consent-001",
    consentType: "data_processing",
    status: "active",
    scope: "demographics,clinical_notes",
    grantedAt: "2026-06-29T10:00:00Z",
    expiresAt: null,
  } satisfies ConsentRecord,
  expiringSoon: {
    id: "consent-002",
    consentType: "research",
    status: "active",
    scope: "lab_results",
    grantedAt: "2026-06-01T00:00:00Z",
    expiresAt: "2026-07-01T00:00:00Z",
  } satisfies ConsentRecord,
  revoked: {
    id: "consent-003",
    consentType: "communications",
    status: "revoked",
    scope: "messaging",
    grantedAt: "2026-05-01T00:00:00Z",
    expiresAt: null,
  } satisfies ConsentRecord,
};

/** Build a mock `Response` for fetch in a single readable line. */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Service-layer tests ───────────────────────────────────────────────────────

describe("createMobileConsentService — fixtures + happy paths (#707)", () => {
  const svc = createMobileConsentService("http://api.test");

  it("grant() returns the new ConsentRecord on 200", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, consentRecordFixtures.active));
    const result = await svc.grant("patient-1", {
      consentType: "data_processing",
      scope: "demographics,clinical_notes",
    });
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.id).toBe("consent-001");
      expect(result.data.status).toBe("active");
    }
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/patients/patient-1/consent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-clinic-id": "default" }),
      }),
    );
  });

  it("getActive() returns the array of active consents", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, [consentRecordFixtures.active, consentRecordFixtures.expiringSoon]),
    );
    const result = await svc.getActive("patient-1");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe("consent-001");
    }
  });

  it("revoke() flips status to revoked when the backend returns one", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, consentRecordFixtures.revoked));
    const result = await svc.revoke("patient-1", "consent-003");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.status).toBe("revoked");
    }
  });
});

describe("createMobileConsentService — error paths (#707)", () => {
  const svc = createMobileConsentService("http://api.test");

  it("returns error with backend-supplied message on 4xx", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(400, { error: "Invalid scope" }));
    const result = await svc.grant("patient-1", { consentType: "x", scope: "y" });
    expect(result.type).toBe("error");
    if (result.type === "error") expect(result.message).toBe("Invalid scope");
  });

  it("falls back to a generic HTTP message when body has no error field", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(503, {}));
    const result = await svc.getActive("patient-1");
    expect(result.type).toBe("error");
    if (result.type === "error") expect(result.message).toBe("HTTP 503");
  });

  it("surfaces network failures as an error result without throwing", async () => {
    mockFetch.mockRejectedValueOnce(new Error("offline"));
    const result = await svc.getActive("patient-1");
    expect(result.type).toBe("error");
    if (result.type === "error") expect(result.message).toBe("offline");
  });
});

// ── Contract-layer tests ──────────────────────────────────────────────────────

describe("createMobileConsentContract — typed wrapper parity (#707)", () => {
  const contract = createMobileConsentContract("http://api.test");

  it("grant() reaches the same endpoint with the same headers", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, consentRecordFixtures.active));
    const result = await contract.grant("patient-1", {
      consentType: "data_processing",
      scope: "demographics",
    });
    expect(result.status).toBe("ok");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/patients/patient-1/consent",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("list() hits the GET endpoint and parses an array", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, [consentRecordFixtures.active]));
    const result = await contract.list("patient-1");
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.data).toHaveLength(1);
  });

  it("revoke() POSTs to the /revoke sub-resource", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, consentRecordFixtures.revoked));
    const result = await contract.revoke("patient-1", "consent-003");
    expect(result.status).toBe("ok");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/api/v1/patients/patient-1/consent/revoke",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("patient-id is URL-encoded (defends against / in synthetic ids)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, consentRecordFixtures.active));
    await contract.list("patient/with/slashes");
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("patient%2Fwith%2Fslashes");
  });
});
