/**
 * Web consent service-layer fixtures + tests (#706).
 *
 * Existing `__tests__/consent.test.tsx` covers the React component
 * (UI flow + render). This file complements it with the pure service
 * layer (`lib/consent-service.ts` + `lib/consent-contract.ts`) tests
 * and the reusable fixtures other consent specs import. Service-layer
 * tests are deliberately decoupled from React so the API surface can
 * be unit-tested with a single mocked `global.fetch`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  createWebConsentService,
  type ConsentRecord,
} from "../lib/consent-service";
import { createWebConsentContract } from "../lib/consent-contract";

const mockFetch = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

// ── Reusable fixtures ─────────────────────────────────────────────────────────

export const webConsentFixtures = {
  activeProcessing: {
    id: "consent-100",
    consentType: "data_processing",
    status: "active",
    scope: "demographics,clinical_notes",
    grantedAt: "2026-06-29T10:00:00Z",
    expiresAt: null,
  } satisfies ConsentRecord,
  activeResearch: {
    id: "consent-101",
    consentType: "research",
    status: "active",
    scope: "lab_results,imaging",
    grantedAt: "2026-06-15T00:00:00Z",
    expiresAt: "2026-12-31T00:00:00Z",
  } satisfies ConsentRecord,
  revokedSharing: {
    id: "consent-102",
    consentType: "sharing",
    status: "revoked",
    scope: "third_party_share",
    grantedAt: "2026-05-01T00:00:00Z",
    expiresAt: null,
  } satisfies ConsentRecord,
};

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

describe("createWebConsentService (#706)", () => {
  const svc = createWebConsentService("http://web.api.test");

  it("grant() posts to the consent endpoint with the clinic header", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, webConsentFixtures.activeProcessing));
    const result = await svc.grant("p1", "clinic_a", {
      consentType: "data_processing",
      scope: "demographics",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("consent-100");
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-clinic-id"]).toBe("clinic_a");
  });

  it("revoke() sends action=revoke with the consentId in the body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, webConsentFixtures.revokedSharing));
    const result = await svc.revoke("p1", "clinic_a", "consent-102");
    expect(result.ok).toBe(true);
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { action: string; consentId: string };
    expect(body.action).toBe("revoke");
    expect(body.consentId).toBe("consent-102");
  });

  it("returns error path when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("dns failure"));
    const result = await svc.grant("p1", "clinic_a", {
      consentType: "x",
      scope: "y",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("dns failure");
  });

  it("returns error with backend message on non-2xx", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(409, { error: "Consent already exists" }));
    const result = await svc.grant("p1", "clinic_a", {
      consentType: "data_processing",
      scope: "demographics",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Consent already exists");
  });
});

// ── Contract-layer tests ──────────────────────────────────────────────────────

describe("createWebConsentContract (#706)", () => {
  const contract = createWebConsentContract("http://web.api.test");

  it("list() returns the array of consents on 200", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, [
        webConsentFixtures.activeProcessing,
        webConsentFixtures.activeResearch,
      ]),
    );
    const result = await contract.list("p1", "clinic_a");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[1].consentType).toBe("research");
    }
  });

  it("encodes patient ids that contain slashes", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, []));
    await contract.list("p1/with/slash", "clinic_a");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("p1%2Fwith%2Fslash");
  });
});

// ── Cross-layer parity smoke check ────────────────────────────────────────────

describe("service + contract parity (#706)", () => {
  it("both layers return distinguishable success/failure shapes from a single fetch mock", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, webConsentFixtures.activeProcessing));
    const svc = createWebConsentService("http://web.api.test");
    const result = await svc.grant("p1", "clinic_a", {
      consentType: "data_processing",
      scope: "demographics",
    });
    expect(result.ok).toBe(true);

    mockFetch.mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
    const contract = createWebConsentContract("http://web.api.test");
    const failure = await contract.list("p1", "clinic_a");
    expect(failure.ok).toBe(false);
  });
});
