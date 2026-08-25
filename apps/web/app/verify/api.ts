import { getPublicRuntimeConfig } from "@lumen/config/public";
import type { AuditExportBundle, AuditExportVerifyReport } from "@lumen/types";

/**
 * Independently re-verifies a compliance export bundle against live Stellar
 * state. Deliberately unauthenticated — no LumenHealth account is required
 * or sent — this is the same check `apps/stellar-service`'s standalone
 * `verify-export` CLI performs, exposed as a page anyone holding an export
 * file can use.
 */
export async function verifyExportBundle(bundle: AuditExportBundle): Promise<AuditExportVerifyReport> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/audit/verify-export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `Failed to verify export bundle (${res.status})`,
    );
  }

  return (await res.json()) as AuditExportVerifyReport;
}
