import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://api.test" }),
}));

import { exportAuditLog, fetchAnchoringHealth, fetchAuditLog, verifyAuditEntry } from "../app/audit/api";
import { fetchClinic, updateClinic } from "../app/clinic/api";
import { fetchStaff, updateStaffRole } from "../app/staff/api";
import { verifyExportBundle } from "../app/verify/api";
import { authHeaders, isAbortError, jsonHeaders, pathSegment } from "../lib/http";

const fetchMock = vi.fn();

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ok({ staff: [], clinic: {}, entries: [], total: 0 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: (init.headers ?? {}) as Record<string, string> };
};

describe("headers (#1501)", () => {
  it("sends no Content-Type on GET requests", async () => {
    await fetchAuditLog({}, "tok");
    expect(lastCall().headers).toEqual({ Authorization: "Bearer tok" });

    await fetchStaff("tok");
    expect(lastCall().headers).not.toHaveProperty("Content-Type");

    await verifyAuditEntry("a-1", "tok");
    expect(lastCall().headers).not.toHaveProperty("Content-Type");
  });

  it("still sends application/json on PATCH requests with a body", async () => {
    await updateStaffRole("s-1", { role: "admin" }, "tok");
    expect(lastCall().init.method).toBe("PATCH");
    expect(lastCall().headers).toEqual({ Authorization: "Bearer tok", "Content-Type": "application/json" });

    await updateClinic("c-1", { name: "N" }, "tok");
    expect(lastCall().headers["Content-Type"]).toBe("application/json");
  });

  it("builds the header sets", () => {
    expect(authHeaders("t")).toEqual({ Authorization: "Bearer t" });
    expect(jsonHeaders("t")).toEqual({ Authorization: "Bearer t", "Content-Type": "application/json" });
  });
});

describe("path encoding (#1500)", () => {
  const hostile = "x/../../clinics/abc?admin=1#frag";
  const encoded = encodeURIComponent(hostile);

  it("encodes ids containing / and ? in every helper that builds a path", async () => {
    await verifyAuditEntry(hostile, "tok");
    expect(lastCall().url).toBe(`http://api.test/api/v1/audit/${encoded}/verify`);

    await updateStaffRole(hostile, { role: "admin" }, "tok");
    expect(lastCall().url).toBe(`http://api.test/api/v1/staff/${encoded}/role`);

    await fetchClinic(hostile, "tok");
    expect(lastCall().url).toBe(`http://api.test/api/v1/clinics/${encoded}`);

    await updateClinic(hostile, { name: "N" }, "tok");
    expect(lastCall().url).toBe(`http://api.test/api/v1/clinics/${encoded}`);
    expect(lastCall().url).not.toContain("?admin");
  });

  it("leaves ordinary ids unchanged", () => {
    expect(pathSegment("abc-123_X.y")).toBe("abc-123_X.y");
  });
});

describe("AbortSignal (#1499)", () => {
  it("forwards the signal from every fetch helper", async () => {
    const { signal } = new AbortController();

    await fetchAuditLog({}, "tok", { signal });
    expect(lastCall().init.signal).toBe(signal);
    await verifyAuditEntry("a", "tok", { signal });
    expect(lastCall().init.signal).toBe(signal);
    await exportAuditLog({}, "tok", { signal });
    expect(lastCall().init.signal).toBe(signal);
    await fetchAnchoringHealth("tok", { signal });
    expect(lastCall().init.signal).toBe(signal);
    await fetchStaff("tok", { signal });
    expect(lastCall().init.signal).toBe(signal);
    await updateStaffRole("s", { role: "admin" }, "tok", { signal });
    expect(lastCall().init.signal).toBe(signal);
    await fetchClinic("c", "tok", { signal });
    expect(lastCall().init.signal).toBe(signal);
    await updateClinic("c", { name: "N" }, "tok", { signal });
    expect(lastCall().init.signal).toBe(signal);
    fetchMock.mockImplementation(async () => ok({ ok: true }));
    await verifyExportBundle({} as never, { signal });
    expect(lastCall().init.signal).toBe(signal);
  });

  it("omits the signal when none is given", async () => {
    await fetchStaff("tok");
    expect(lastCall().init.signal).toBeUndefined();
  });

  it("recognizes AbortError", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("nope"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
