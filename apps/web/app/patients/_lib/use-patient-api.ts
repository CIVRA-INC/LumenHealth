"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPublicRuntimeConfig } from "@lumen/config/public";
import { useAuthSession } from "../../auth/session-provider";

export type PatientApiResult<T> = {
  ok: boolean;
  status: number;
  body: T | null;
  unauthorized: boolean;
};

/**
 * Auth-aware fetch wrapper for the patient API.
 *
 * - Prepends `apiBaseUrl` from `@lumen/config/public`.
 * - Adds `Authorization: Bearer ${session.accessToken}` from
 *   `useAuthSession()` — the session lives in localStorage and is exposed
 *   by `AuthSessionProvider` (see apps/web/app/auth/session-provider.tsx).
 * - JSON-parses the response body once and returns a structured result.
 * - On 401 (or missing session) the hook pushes the caller to
 *   `/auth/login` via `next/navigation` rather than letting the UI
 *   render broken state.
 */
export function usePatientApi() {
  const { session } = useAuthSession();
  const router = useRouter();
  const accessToken = session?.accessToken;

  const fetchApi = useCallback(
    async <T,>(endpoint: string, init?: RequestInit): Promise<PatientApiResult<T>> => {
      if (!accessToken) {
        router.push("/auth/login");
        return { ok: false, status: 401, body: null, unauthorized: true };
      }
      const { apiBaseUrl } = getPublicRuntimeConfig();
      let response: Response;
      try {
        response = await fetch(`${apiBaseUrl}${endpoint}`, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...(init?.headers ?? {}),
          },
        });
      } catch {
        return { ok: false, status: 0, body: null, unauthorized: false };
      }
      let body: T | null = null;
      try {
        body = (await response.json()) as T;
      } catch {
        body = null;
      }
      if (response.status === 401) {
        router.push("/auth/login");
        return { ok: false, status: 401, body, unauthorized: true };
      }
      return {
        ok: response.ok,
        status: response.status,
        body,
        unauthorized: false,
      };
    },
    [accessToken, router],
  );

  return { fetchApi };
}
