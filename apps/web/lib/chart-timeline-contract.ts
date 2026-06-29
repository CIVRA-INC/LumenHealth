import { contractApi } from "../chart-timeline/contract";

export type ChartContractDTO = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number; height: number };
  notes: string;
  createdAt: string;
};

export type CreateContractPayload = Omit<ChartContractDTO, "id" | "createdAt">;

export type ContractClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function createWebContractClient() {
  function create(patientId: string, payload: CreateContractPayload): ContractClientResult<ChartContractDTO> {
    return contractApi.create(patientId, payload as unknown as Record<string, unknown>);
  }

  function getTimeline(patientId: string): ContractClientResult<ChartContractDTO[]> {
    return contractApi.get(patientId);
  }

  function getLatest(patientId: string): ContractClientResult<ChartContractDTO> {
    return contractApi.getLatest(patientId);
  }

  return { create, getTimeline, getLatest };
}
