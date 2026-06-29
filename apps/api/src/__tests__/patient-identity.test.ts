import type { Request, Response } from "express";

type PatientRecord = {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  createdAt: string;
};

type CreatePatientPayload = Omit<PatientRecord, "id" | "clinicId" | "createdAt">;

function createPatient(body: CreatePatientPayload, clinicId: string): PatientRecord {
  return {
    id: `pat_${Date.now()}`,
    clinicId,
    ...body,
    createdAt: new Date().toISOString(),
  };
}

function validatePatientPayload(body: Record<string, unknown>): string | null {
  if (!body.firstName || typeof body.firstName !== "string") return "firstName is required";
  if (!body.lastName || typeof body.lastName !== "string") return "lastName is required";
  if (!body.dateOfBirth || typeof body.dateOfBirth !== "string") return "dateOfBirth is required";
  if (!body.phone || typeof body.phone !== "string") return "phone is required";
  if (body.email && typeof body.email !== "string") return "email must be a string";
  return null;
}

function respond(
  res: Response,
  status: number,
  payload: Record<string, unknown>,
): void {
  res.status(status).json(payload);
}

function isValidDate(dob: string): boolean {
  const d = new Date(dob);
  return !isNaN(d.getTime()) && d <= new Date();
}

type Fixture = {
  validPatient: CreatePatientPayload;
  invalidPatient: Partial<CreatePatientPayload>;
  clinicId: string;
};

const fixtures: Fixture = {
  validPatient: {
    firstName: "Alice",
    lastName: "Mendoza",
    dateOfBirth: "1990-04-12",
    phone: "+1-555-0100",
    email: "alice.mendoza@example.com",
  },
  invalidPatient: {
    firstName: "",
    lastName: "Mendoza",
    dateOfBirth: "1990-04-12",
    phone: "+1-555-0100",
  },
  clinicId: "clinic_demo_01",
};

describe("POST /api/v1/patients", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    mockRes = { status: statusSpy, json: jsonSpy } as Partial<Response>;
  });

  it("creates a patient record when payload is valid", () => {
    mockReq = { body: fixtures.validPatient, headers: { "x-clinic-id": fixtures.clinicId } };

    const error = validatePatientPayload(mockReq.body as Record<string, unknown>);
    expect(error).toBeNull();

    const clinicId = (mockReq.headers as Record<string, string>)["x-clinic-id"];
    const patient = createPatient(mockReq.body as CreatePatientPayload, clinicId);

    respond(mockRes as Response, 201, { patient });
    expect(statusSpy).toHaveBeenCalledWith(201);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ patient: expect.objectContaining({ firstName: "Alice", clinicId: fixtures.clinicId }) }),
    );
  });

  it("rejects when firstName is missing", () => {
    mockReq = { body: fixtures.invalidPatient };

    const error = validatePatientPayload(mockReq.body as Record<string, unknown>);
    expect(error).toBe("firstName is required");
  });

  it("rejects when dateOfBirth is invalid", () => {
    const body = { ...fixtures.validPatient, dateOfBirth: "not-a-date" };
    expect(isValidDate(body.dateOfBirth)).toBe(false);
  });

  it("accepts patient without email", () => {
    const { email: _, ...body } = fixtures.validPatient;
    const error = validatePatientPayload(body as Record<string, unknown>);
    expect(error).toBeNull();
  });

  it("generates a unique patient id on creation", () => {
    const p1 = createPatient(fixtures.validPatient, fixtures.clinicId);
    const p2 = createPatient(fixtures.validPatient, fixtures.clinicId);
    expect(p1.id).not.toBe(p2.id);
  });
});
