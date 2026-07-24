import { serverConfig } from "@lumen/config";
import type { BatchAnchorResult } from "@lumen/types";
import type { FetchUnanchoredEntries, PersistAnchorResult, UnanchoredEntry } from "./anchoring.js";

const INTERNAL_AUDIT_PATH = "/internal/audit";

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-internal-service-token": serverConfig.internalServiceToken,
  };
}

/** Pulls unanchored audit entry hashes from `apps/api`'s internal endpoint. */
export const fetchUnanchoredEntries: FetchUnanchoredEntries = async () => {
  const res = await fetch(`${serverConfig.public.apiBaseUrl}${INTERNAL_AUDIT_PATH}/unanchored`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`[stellar-service] failed to fetch unanchored entries: ${res.status}`);
  }

  const body = (await res.json()) as { entries: UnanchoredEntry[] };
  return body.entries;
};

/** Persists a completed batch anchor result back against each audit entry in `apps/api`. */
export const persistAnchorResult: PersistAnchorResult = async (result: BatchAnchorResult) => {
  const res = await fetch(`${serverConfig.public.apiBaseUrl}${INTERNAL_AUDIT_PATH}/anchor-result`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(result),
  });

  if (!res.ok) {
    throw new Error(`[stellar-service] failed to persist anchor result: ${res.status}`);
  }
};
