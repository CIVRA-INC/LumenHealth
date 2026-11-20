export interface KikePatientSummary {
  id: string;
  clinicId: string;
  fullName: string;
  dateOfBirth?: string;
  mrn?: string;
}

export interface KikePatientListQuery {
  clinicId: string;
  query?: string;
  cursor?: string | null;
  limit?: number;
}

export interface KikePatientListPage {
  items: KikePatientSummary[];
  nextCursor: string | null;
}

export interface KikePatientApi {
  listPatients(query: KikePatientListQuery, signal?: AbortSignal): Promise<KikePatientListPage>;
}

export function normalizePatientSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function shouldRunPatientSearch(query: string, debounceMs = 300): { query: string; debounceMs: number } {
  return { query: normalizePatientSearchQuery(query), debounceMs };
}

export function mergePatientPages(existing: KikePatientSummary[], incoming: KikePatientSummary[]): KikePatientSummary[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const p of incoming) byId.set(p.id, p);
  return [...byId.values()];
}

export function canViewPatientList(permissions: readonly string[] | undefined): boolean {
  return Array.isArray(permissions) && permissions.includes("patient:read");
}

export class KikePatientSearchController {
  private abortController: AbortController | null = null;

  cancelInFlight(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  async search(api: KikePatientApi, query: KikePatientListQuery): Promise<KikePatientListPage> {
    this.cancelInFlight();
    this.abortController = new AbortController();
    return api.listPatients({ ...query, query: normalizePatientSearchQuery(query.query ?? "") }, this.abortController.signal);
  }
}
