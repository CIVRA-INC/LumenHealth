export type Vitals = {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  height: number;
};

export type ChartEntryData = {
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  vitals: Vitals;
  notes: string;
};

export type MobileServiceResult<T> =
  | { type: "success"; data: T }
  | { type: "error"; message: string };

const API_PATH = "/api/v1";

export function createMobileChartService(baseUrl: string) {
  async function request<T>(method: string, path: string, body?: unknown, clinicId = "default"): Promise<MobileServiceResult<T>> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { "content-type": "application/json", "x-clinic-id": clinicId },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) return { type: "error", message: data.error || `HTTP ${res.status}` };
      return { type: "success", data: data as T };
    } catch (e) {
      return { type: "error", message: e instanceof Error ? e.message : "Network error" };
    }
  }

  function addEntry(patientId: string, entry: ChartEntryData) {
    return request<ChartEntryData>("POST", `${API_PATH}/patients/${patientId}/chart-timeline`, entry);
  }

  function getTimeline(patientId: string) {
    return request<ChartEntryData[]>("GET", `${API_PATH}/patients/${patientId}/chart-timeline`);
  }

  return { addEntry, getTimeline };
}
