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
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
};

type CreatePayload = Omit<DemographicsRecord, "id" | "patientId" | "createdAt" | "updatedAt">;

const db = new Map<string, DemographicsRecord>();
const k = (pid: string) => pid;
const now = () => new Date().toISOString();

export function handleCreate(req: Request, res: Response) {
  const body = req.body as CreatePayload;
  if (!body.dateOfBirth || !body.gender) {
    res.status(400).json({ error: "VALIDATION_ERROR" });
    return;
  }
  const record: DemographicsRecord = {
    id: `demo_${Date.now()}`,
    patientId: req.params.patientId,
    ...body,
    createdAt: now(),
    updatedAt: now(),
  };
  db.set(k(record.patientId), record);
  res.status(201).json(record);
}

export function handleGet(req: Request, res: Response) {
  const record = db.get(k(req.params.patientId));
  if (!record) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  res.json(record);
}

export function handleUpdate(req: Request, res: Response) {
  const existing = db.get(k(req.params.patientId));
  if (!existing) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  const updated = { ...existing, ...(req.body as Partial<CreatePayload>), updatedAt: now() };
  db.set(k(updated.patientId), updated);
  res.json(updated);
}

export function formatDemographicsForDisplay(record: DemographicsRecord): Record<string, string> {
  const age = Math.floor(
    (Date.now() - new Date(record.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  return {
    name: record.patientId,
    age: String(age),
    gender: record.gender,
    bloodGroup: record.bloodGroup || "N/A",
    address: `${record.address.street}, ${record.address.city}`,
    emergencyContact: `${record.emergencyContact.name} (${record.emergencyContact.phone})`,
  };
}

const validPayload: CreatePayload = {
  dateOfBirth: "1985-09-15",
  gender: "male",
  maritalStatus: "married",
  bloodGroup: "A+",
  occupation: "Engineer",
  nationality: "Nigerian",
  primaryLanguage: "English",
  address: { street: "15 Test Rd", city: "Lagos", state: "Lagos", postalCode: "100001", country: "NG" },
  emergencyContact: { name: "Test User", relationship: "Friend", phone: "+234-800-555-0000" },
};

describe("Demographics API — Tests & Fixtures", () => {
  let res: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    res = { status, json };
    db.clear();
  });

  it("creates a demographics record", () => {
    handleCreate({ params: { patientId: "pat_01" }, body: validPayload } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ patientId: "pat_01", gender: "male" }));
  });

  it("rejects invalid creation request", () => {
    handleCreate({ params: { patientId: "pat_01" }, body: {} } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("retrieves a record", () => {
    handleCreate({ params: { patientId: "pat_01" }, body: validPayload } as unknown as Request, res as Response);
    handleGet({ params: { patientId: "pat_01" } } as unknown as Request, res as Response);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ patientId: "pat_01" }));
  });

  it("returns 404 for missing record", () => {
    handleGet({ params: { patientId: "pat_missing" } } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("updates a demographics record", () => {
    handleCreate({ params: { patientId: "pat_01" }, body: validPayload } as unknown as Request, res as Response);
    handleUpdate({ params: { patientId: "pat_01" }, body: { occupation: "Senior Engineer" } } as unknown as Request, res as Response);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ occupation: "Senior Engineer" }));
  });

  it("formats demographics for display", () => {
    handleCreate({ params: { patientId: "pat_01" }, body: validPayload } as unknown as Request, res as Response);
    const record = db.get("pat_01")!;
    const display = formatDemographicsForDisplay(record);
    expect(display.age).toBeDefined();
    expect(display.gender).toBe("male");
    expect(display.bloodGroup).toBe("A+");
  });
});

export { validPayload as fixtures };
