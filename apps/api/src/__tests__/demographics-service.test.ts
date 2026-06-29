import type { Request, Response } from "express";

type DemographicsRecord = {
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

type CreatePayload = Omit<DemographicsRecord, "id" | "patientId" | "createdAt" | "updatedAt">;

const db = new Map<string, DemographicsRecord>();
const k = (pid: string) => pid;

function now(): string {
  return new Date().toISOString();
}

export function handleGetDemographics(req: Request, res: Response) {
  const record = db.get(k(req.params.patientId));
  if (!record) { res.status(404).json({ error: "DEMOGRAPHICS_NOT_FOUND" }); return; }
  res.json(record);
}

export function handleCreateDemographics(req: Request, res: Response) {
  const body = req.body as CreatePayload;
  if (!body.dateOfBirth || !body.gender) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "dateOfBirth and gender are required" });
    return;
  }
  const record: DemographicsRecord = {
    id: `demo_${Date.now()}`,
    patientId: req.params.patientId,
    ...body,
    address: { country: "NG", ...body.address },
    createdAt: now(),
    updatedAt: now(),
  };
  db.set(k(record.patientId), record);
  res.status(201).json(record);
}

export function handleUpdateDemographics(req: Request, res: Response) {
  const existing = db.get(k(req.params.patientId));
  if (!existing) { res.status(404).json({ error: "DEMOGRAPHICS_NOT_FOUND" }); return; }
  const updated: DemographicsRecord = {
    ...existing,
    ...(req.body as Partial<CreatePayload>),
    updatedAt: now(),
  };
  db.set(k(updated.patientId), updated);
  res.json(updated);
}

export function handleDeleteDemographics(req: Request, res: Response) {
  const ok = db.delete(k(req.params.patientId));
  if (!ok) { res.status(404).json({ error: "DEMOGRAPHICS_NOT_FOUND" }); return; }
  res.json({ ok: true });
}

export const fixtures = {
  validPayload: {
    dateOfBirth: "1992-11-03",
    gender: "female",
    maritalStatus: "single",
    bloodGroup: "A+",
    occupation: "Nurse",
    nationality: "Nigerian",
    primaryLanguage: "English",
    address: { street: "10 Health Road", city: "Abuja", state: "FCT", postalCode: "900001", country: "NG" },
    emergencyContact: { name: "Fatima Usman", relationship: "Sister", phone: "+234-800-555-0102" },
  } satisfies CreatePayload,

  invalidPayload: {
    dateOfBirth: "",
    gender: "",
  } as unknown as CreatePayload,
};

describe("Demographics API Handlers", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    req = { params: { patientId: "pat_test_01" }, body: {}, headers: { "x-clinic-id": "clinic_01" } };
    res = { status, json } as Partial<Response>;
    db.clear();
  });

  it("creates a demographics record", () => {
    req.body = fixtures.validPayload;
    handleCreateDemographics(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ gender: "female", patientId: "pat_test_01" }));
  });

  it("returns 400 when required fields are missing", () => {
    req.body = fixtures.invalidPayload;
    handleCreateDemographics(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: "VALIDATION_ERROR" }));
  });

  it("retrieves a demographics record", () => {
    req.body = fixtures.validPayload;
    handleCreateDemographics(req as Request, res as Response);
    handleGetDemographics(req as Request, res as Response);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ patientId: "pat_test_01" }));
  });

  it("returns 404 for missing record on GET", () => {
    handleGetDemographics(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("updates an existing record", () => {
    req.body = fixtures.validPayload;
    handleCreateDemographics(req as Request, res as Response);
    req.body = { occupation: "Senior Nurse" };
    handleUpdateDemographics(req as Request, res as Response);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ occupation: "Senior Nurse" }));
  });

  it("deletes a record", () => {
    req.body = fixtures.validPayload;
    handleCreateDemographics(req as Request, res as Response);
    handleDeleteDemographics(req as Request, res as Response);
    expect(json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 404 on delete for missing record", () => {
    handleDeleteDemographics(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(404);
  });
});
