export type VitalsPayload = {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  height: number;
};

export type ChartTimelinePayload = {
  date: string;
  encounterType: string;
  provider: string;
  vitals: VitalsPayload;
  notes: string;
};

export type ServiceResponse<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

const API_BASE = "/api/v1/patients";

function buildUrl(base: string, patientId: string): string {
  return `${base.replace(/\/+$/, "")}${API_BASE}/${encodeURIComponent(patientId)}/chart-timeline`;
}

export function createWebChartService(baseUrl: string) {
  const url = baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function addEntry(patientId: string, clinicId: string, payload: ChartTimelinePayload): Promise<ServiceResponse<unknown>> {
    try {
      const res = await fetch(buildUrl(url, patientId), {
        method: "POST",
        headers: { "content-type": "application/json", "x-clinic-id": clinicId },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "HTTP " + res.status, status: res.status };
      return { ok: true, data, status: res.status };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error", status: 0 };
    }
  }

  async function getTimeline(patientId: string, clinicId: string): Promise<ServiceResponse<unknown[]>> {
    try {
      const res = await fetch(buildUrl(url, patientId), { headers: { "x-clinic-id": clinicId } });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: "HTTP " + res.status, status: res.status };
      return { ok: true, data: data as unknown[], status: res.status };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error", status: 0 };
    }
  }

  return { addEntry, getTimeline };
}
