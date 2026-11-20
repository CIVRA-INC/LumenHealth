import { getPublicRuntimeConfig } from "@lumen/config/public";
import type { AnchoringHealthReport, AuditAction, AuditEntry, AuditExportBundle, AuditVerifyResponse } from "@lumen/types";
import { authHeaders, pathSegment, type RequestOptions } from "../../lib/http";

export type AuditLogFilters = {
  action?: AuditAction;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type AuditLogResult = {
  entries: AuditEntry[];
  total: number;
};

export async function fetchAuditLog(
  filters: AuditLogFilters,
  token: string,
  options: RequestOptions = {},
): Promise<AuditLogResult> {
  const { apiBaseUrl } = getPublicRuntimeConfig();

  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const res = await fetch(`${apiBaseUrl}/api/v1/audit${query ? `?${query}` : ""}`, {
    headers: authHeaders(token),
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `Failed to fetch audit log (${res.status})`,
    );
  }

  return (await res.json()) as AuditLogResult;
}

export async function verifyAuditEntry(
  auditId: string,
  token: string,
  options: RequestOptions = {},
): Promise<AuditVerifyResponse> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/audit/${pathSegment(auditId)}/verify`, {
    headers: authHeaders(token),
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `Failed to verify audit entry (${res.status})`,
    );
  }

  return (await res.json()) as AuditVerifyResponse;
}

export type AuditExportFilters = {
  from?: string;
  to?: string;
};

/**
 * Fetches a signed, externally-verifiable compliance export for the
 * caller's clinic. The returned bundle is self-contained — it can be saved
 * to disk and checked independently with
 * `apps/stellar-service`'s `verify-export` script, without any further
 * calls to this API.
 */
export async function exportAuditLog(
  filters: AuditExportFilters,
  token: string,
  options: RequestOptions = {},
): Promise<AuditExportBundle> {
  const { apiBaseUrl } = getPublicRuntimeConfig();

  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const query = params.toString();
  const res = await fetch(`${apiBaseUrl}/api/v1/audit/export${query ? `?${query}` : ""}`, {
    headers: authHeaders(token),
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `Failed to export audit log (${res.status})`,
    );
  }

  return (await res.json()) as AuditExportBundle;
}

/**
 * Fetches the anchoring pipeline's operational health — whether the
 * scheduled batch job is actually keeping up — as opposed to any single
 * entry's verification status.
 */
export async function fetchAnchoringHealth(
  token: string,
  options: RequestOptions = {},
): Promise<AnchoringHealthReport> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/audit/anchoring-health`, {
    headers: authHeaders(token),
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `Failed to fetch anchoring health (${res.status})`,
    );
  }

  return (await res.json()) as AnchoringHealthReport;
}
