export type DemographicsDTO = {
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

export type CreateDemographicsRequest = Omit<DemographicsDTO, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">;

export type UpdateDemographicsRequest = Partial<CreateDemographicsRequest>;

export type ContractEndpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  response: unknown;
};

export const DEMOGRAPHICS_CONTRACT = {
  get: {
    method: "GET" as const,
    path: "/api/v1/patients/:patientId/demographics",
    headers: { "x-clinic-id": "string" },
    response: {} as DemographicsDTO,
  },
  create: {
    method: "POST" as const,
    path: "/api/v1/patients/:patientId/demographics",
    headers: { "x-clinic-id": "string", "content-type": "application/json" },
    body: {} as CreateDemographicsRequest,
    response: {} as DemographicsDTO,
  },
  update: {
    method: "PATCH" as const,
    path: "/api/v1/patients/:patientId/demographics",
    headers: { "x-clinic-id": "string", "content-type": "application/json" },
    body: {} as UpdateDemographicsRequest,
    response: {} as DemographicsDTO,
  },
  delete: {
    method: "DELETE" as const,
    path: "/api/v1/patients/:patientId/demographics",
    headers: { "x-clinic-id": "string" },
    response: { ok: true },
  },
} as const;

export type DemographicsEndpoints = typeof DEMOGRAPHICS_CONTRACT;

export function buildUrl(baseUrl: string, patientId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/v1/patients/${encodeURIComponent(patientId)}/demographics`;
}

export function validateContractResponse(status: number, body: unknown): string | null {
  if (status === 200 || status === 201) return null;
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 500) return "SERVER_ERROR";
  return `UNEXPECTED_STATUS_${status}`;
}
