/** Options accepted by every API helper so callers can cancel in-flight requests. */
export type RequestOptions = { signal?: AbortSignal };

/** Authorization only. Use for GET/DELETE: no Content-Type means no extra CORS preflight trigger. */
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Authorization plus a JSON content type, for requests that actually send a JSON body. */
export function jsonHeaders(token: string): Record<string, string> {
  return { ...authHeaders(token), "Content-Type": "application/json" };
}

/**
 * Encodes one identifier for use as a URL path segment, so ids containing `/`, `?`, `#` or `..`
 * cannot change which endpoint is called. Always use this for ids interpolated into paths.
 */
export function pathSegment(id: string): string {
  return encodeURIComponent(id);
}

/** True for the error `fetch` rejects with after `AbortController.abort()`. */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}
