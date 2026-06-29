export type ConsentContractDTO = {
  id: string;
  patientId: string;
  consentType: string;
  status: "granted" | "revoked" | "expired";
  scope: string;
  grantedAt: string;
  expiresAt: string | null;
};

export type GrantPayload = {
  consentType: string;
  scope: string;
  expiresAt?: string;
};

export type ContractEndpoint = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  response: unknown;
};

export const CONSENT_CONTRACT = {
  grant: {
    method: "POST" as const,
    path: "/api/v1/patients/:patientId/consent",
    headers: { "content-type": "application/json", "x-clinic-id": "string" },
    body: {} as GrantPayload,
    response: {} as ConsentContractDTO,
  },
  list: {
    method: "GET" as const,
    path: "/api/v1/patients/:patientId/consent",
    headers: { "x-clinic-id": "string" },
    response: [] as ConsentContractDTO[],
  },
  revoke: {
    method: "POST" as const,
    path: "/api/v1/patients/:patientId/consent/revoke",
    headers: { "content-type": "application/json", "x-clinic-id": "string" },
    body: { consentId: "" },
    response: {} as ConsentContractDTO,
  },
} as const;

export type ConsentEndpoints = typeof CONSENT_CONTRACT;
