import type { Request, Response } from "express";

type DemographicsDTO = {
  id: string;
  patientId: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus?: string;
  bloodGroup?: string;
  occupation?: string;
  nationality?: string;
  primaryLanguage?: string;
  address: { street: string; city: string; state: string; postalCode: string; country: string };
  emergencyContact: { name: string; relationship: string; phone: string; email?: string };
  createdAt: string;
  updatedAt: string;
};

const BASE_URL = "/api/v1/patients/:patientId/demographics";
const REQUIRED_FIELDS = ["dateOfBirth", "gender"] as const;

function validate(body: Record<string, unknown>): string | null {
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || typeof body[field] !== "string") return `${field} is required`;
  }
  return null;
}

function now(): string {
  return new Date().toISOString();
}

const store = new Map<string, DemographicsDTO>();
const key = (pid: string) => pid;

export const contract = {
  BASE_URL,
  REQUIRED_FIELDS,

  validate,

  create(patientId: string, data: Record<string, unknown>): { status: number; body: unknown } {
    const error = validate(data);
    if (error) return { status: 400, body: { error: "VALIDATION_ERROR", message: error } };
    const record: DemographicsDTO = {
      id: `demo_${Date.now()}`,
      patientId,
      ...(data as Omit<DemographicsDTO, "id" | "patientId" | "createdAt" | "updatedAt">),
      createdAt: now(),
      updatedAt: now(),
    };
    store.set(key(patientId), record);
    return { status: 201, body: record };
  },

  get(patientId: string): { status: number; body: unknown } {
    const record = store.get(key(patientId));
    if (!record) return { status: 404, body: { error: "NOT_FOUND" } };
    return { status: 200, body: record };
  },

  update(patientId: string, data: Record<string, unknown>): { status: number; body: unknown } {
    const existing = store.get(key(patientId));
    if (!existing) return { status: 404, body: { error: "NOT_FOUND" } };
    const updated = { ...existing, ...data, updatedAt: now() } as DemographicsDTO;
    store.set(key(patientId), updated);
    return { status: 200, body: updated };
  },

  remove(patientId: string): { status: number; body: unknown } {
    if (!store.has(key(patientId))) return { status: 404, body: { error: "NOT_FOUND" } };
    store.delete(key(patientId));
    return { status: 200, body: { ok: true } };
  },
};

describe("Demographics API Contract", () => {
  beforeEach(() => store.clear());

  const patientId = "pat_contract_01";
  const validData = {
    dateOfBirth: "1988-03-15",
    gender: "male",
    address: { street: "1 Test Ave", city: "Lagos", state: "Lagos", postalCode: "100001", country: "NG" },
    emergencyContact: { name: "Test", relationship: "Friend", phone: "+234-800-000-0000" },
  };

  it("creates and retrieves a record per contract", () => {
    const created = contract.create(patientId, validData);
    expect(created.status).toBe(201);
    const fetched = contract.get(patientId);
    expect(fetched.status).toBe(200);
    expect((fetched.body as DemographicsDTO).patientId).toBe(patientId);
  });

  it("rejects create without required fields", () => {
    const result = contract.create(patientId, {});
    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for missing record", () => {
    const result = contract.get("pat_does_not_exist");
    expect(result.status).toBe(404);
  });

  it("updates an existing record", () => {
    contract.create(patientId, validData);
    const updated = contract.update(patientId, { occupation: "Doctor" });
    expect(updated.status).toBe(200);
    expect((updated.body as DemographicsDTO).occupation).toBe("Doctor");
  });

  it("removes a record", () => {
    contract.create(patientId, validData);
    const removed = contract.remove(patientId);
    expect(removed.status).toBe(200);
    expect((removed.body as { ok: boolean }).ok).toBe(true);
    const fetched = contract.get(patientId);
    expect(fetched.status).toBe(404);
  });
});
