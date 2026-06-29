import type { Request, Response, NextFunction } from "express";

export type DemographicsRecord = {
  id: string;
  patientId: string;
  clinicId: string;
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

export type CreateDemographicsBody = Omit<DemographicsRecord, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">;

export type DemographicsService = {
  findByPatientId(patientId: string, clinicId: string): DemographicsRecord | undefined;
  create(patientId: string, clinicId: string, data: CreateDemographicsBody): DemographicsRecord;
  update(patientId: string, clinicId: string, data: Partial<CreateDemographicsBody>): DemographicsRecord | undefined;
  delete(patientId: string, clinicId: string): boolean;
};

const store = new Map<string, DemographicsRecord>();

function key(patientId: string, clinicId: string): string {
  return `${clinicId}::${patientId}`;
}

export function createDemographicsService(): DemographicsService {
  return {
    findByPatientId(patientId: string, clinicId: string) {
      return store.get(key(patientId, clinicId));
    },

    create(patientId: string, clinicId: string, data: CreateDemographicsBody) {
      const now = new Date().toISOString();
      const record: DemographicsRecord = {
        id: `demo_${Date.now()}`,
        patientId,
        clinicId,
        ...data,
        address: { country: "NG", ...data.address },
        createdAt: now,
        updatedAt: now,
      };
      store.set(key(patientId, clinicId), record);
      return record;
    },

    update(patientId: string, clinicId: string, data: Partial<CreateDemographicsBody>) {
      const existing = store.get(key(patientId, clinicId));
      if (!existing) return undefined;
      const updated: DemographicsRecord = {
        ...existing,
        ...data,
        address: data.address ? { ...existing.address, ...data.address } : existing.address,
        emergencyContact: data.emergencyContact ? { ...existing.emergencyContact, ...data.emergencyContact } : existing.emergencyContact,
        updatedAt: new Date().toISOString(),
      };
      store.set(key(patientId, clinicId), updated);
      return updated;
    },

    delete(patientId: string, clinicId: string) {
      return store.delete(key(patientId, clinicId));
    },
  };
}

const service = createDemographicsService();

export function demographicsRouter(req: Request, res: Response, next: NextFunction) {
  const { patientId } = req.params;
  const clinicId = (req.headers["x-clinic-id"] as string) || "default";
  const method = req.method.toUpperCase();

  if (method === "GET") {
    const record = service.findByPatientId(patientId, clinicId);
    if (!record) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json(record);
    return;
  }

  if (method === "POST") {
    const record = service.create(patientId, clinicId, req.body as CreateDemographicsBody);
    res.status(201).json(record);
    return;
  }

  if (method === "PATCH") {
    const record = service.update(patientId, clinicId, req.body as Partial<CreateDemographicsBody>);
    if (!record) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json(record);
    return;
  }

  if (method === "DELETE") {
    const ok = service.delete(patientId, clinicId);
    if (!ok) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ ok: true });
    return;
  }

  next();
}
