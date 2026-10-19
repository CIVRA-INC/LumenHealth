import { serverConfig } from "@lumen/config";
import { signInternalRequest } from "@lumen/types";
import type { BatchAnchorResult } from "@lumen/types";
import type { FetchUnanchoredEntries, PersistAnchorResult, UnanchoredEntry } from "./anchoring.js";

const INTERNAL_AUDIT_PATH = "/internal/audit";

/**
 * Headers for an outbound internal call (#1345): short-lived HMAC over
 * method + path + body hash + timestamp + nonce, signed with the first
 * active secret. No static service token.
 */
function authHeaders(method: string, path: string, body?: unknown): Record<string, string> {
  const primary = serverConfig.internalServiceSecrets[0];
  if (!primary) {
    throw new Error("[stellar-service] no internal service secret configured");
  }
  return {
    "Content-Type": "application/json",
    ...signInternalRequest({ method, path, body }, primary),
  };
}

/** Pulls unanchored audit entry hashes from `apps/api`'s internal endpoint. */
export const fetchUnanchoredEntries: FetchUnanchoredEntries = async () => {
  const path = `${INTERNAL_AUDIT_PATH}/unanchored`;
  const res = await fetch(`${serverConfig.public.apiBaseUrl}${path}`, {
    method: "GET",
    headers: authHeaders("GET", path),
  });

  if (!res.ok) {
    throw new Error(`[stellar-service] failed to fetch unanchored entries: ${res.status}`);
  }

  const body = (await res.json()) as { entries: UnanchoredEntry[] };
  return body.entries;
};

/** Persists a completed batch anchor result back against each audit entry in `apps/api`. */
export const persistAnchorResult: PersistAnchorResult = async (result: BatchAnchorResult) => {
  const path = `${INTERNAL_AUDIT_PATH}/anchor-result`;
  const res = await fetch(`${serverConfig.public.apiBaseUrl}${path}`, {
    method: "POST",
    headers: authHeaders("POST", path, result),
    body: JSON.stringify(result),
  });

  if (!res.ok) {
    throw new Error(`[stellar-service] failed to persist anchor result: ${res.status}`);
  }
};
