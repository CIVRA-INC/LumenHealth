export type ChartContractDTO = {
  id: string;
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  vitals: { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number; height: number };
  notes: string;
};

export type MobileContractResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

const BASE_PATH = "/api/v1";

export function createMobileContractClient(baseUrl: string) {
  async function request<T>(method: string, patientId: string, body?: unknown): Promise<MobileContractResult<T>> {
    try {
      const res = await fetch(`${baseUrl}${BASE_PATH}/patients/${encodeURIComponent(patientId)}/chart-timeline`, {
        method,
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) return { status: "error", message: data.error || `HTTP ${res.status}` };
      return { status: "ok", data: data as T };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : "Request failed" };
    }
  }

  function create(patientId: string, payload: Omit<ChartContractDTO, "id" | "patientId">) {
    return request<ChartContractDTO>("POST", patientId, payload);
  }

  function getTimeline(patientId: string) {
    return request<ChartContractDTO[]>("GET", patientId);
  }

  return { create, getTimeline };
}
