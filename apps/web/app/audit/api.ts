import { getPublicRuntimeConfig } from "@lumen/config/public";
import type { AuditAction, AuditEntry, AuditExportBundle, AuditVerifyResponse } from "@lumen/types";

function headers(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

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
    headers: headers(token),
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
): Promise<AuditVerifyResponse> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/audit/${auditId}/verify`, {
    headers: headers(token),
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
): Promise<AuditExportBundle> {
  const { apiBaseUrl } = getPublicRuntimeConfig();

  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const query = params.toString();
  const res = await fetch(`${apiBaseUrl}/api/v1/audit/export${query ? `?${query}` : ""}`, {
    headers: headers(token),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `Failed to export audit log (${res.status})`,
    );
  }

  return (await res.json()) as AuditExportBundle;
}
