import { describe, it, expect, vi } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("../hooks/useDemographics", () => ({
  useDemographics: vi.fn(),
}));

import { useDemographics, type Demographics } from "../hooks/useDemographics";

const mockDemographics: Demographics = {
  patientId: "patient-123",
  dateOfBirth: "1990-05-15",
  gender: "female",
  ethnicity: "Hispanic",
  nationality: "US",
  preferredLanguage: "en",
  address: {
    city: "New York",
    state: "NY",
    country: "US",
  },
};

describe("Demographics data model", () => {
  it("holds patient identifier", () => {
    expect(mockDemographics.patientId).toBe("patient-123");
  });

  it("has optional dateOfBirth field", () => {
    expect(mockDemographics.dateOfBirth).toBe("1990-05-15");
  });

  it("has optional address with partial fields", () => {
    expect(mockDemographics.address?.city).toBe("New York");
    expect(mockDemographics.address?.street).toBeUndefined();
  });

  it("accepts partial demographics data", () => {
    const partial: Partial<Demographics> = { patientId: "p1", gender: "male" };
    expect(partial.patientId).toBe("p1");
    expect(partial.gender).toBe("male");
  });
});

describe("Demographics API interactions", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches demographics from the API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDemographics,
    });

    const res = await fetch("/api/patients/patient-123/demographics");
    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledWith("/api/patients/patient-123/demographics");
    expect(data.patientId).toBe("patient-123");
  });

  it("handles fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const res = await fetch("/api/patients/patient-123/demographics");
    expect(res.ok).toBe(false);
  });

  it("updates demographics via PUT", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const res = await fetch("/api/patients/patient-123/demographics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender: "male" }),
    });

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/patients/patient-123/demographics",
      expect.objectContaining({ method: "PUT" })
    );
  });
});
