import { AuthTokens } from "./auth-session";

type AuthBindings = {
  getTokens: () => AuthTokens | null;
  refreshAccessToken: () => Promise<string | null>;
  onUnauthorized: () => void;
};

let bindings: AuthBindings | null = null;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export const configureApiClient = (authBindings: AuthBindings) => {
  bindings = authBindings;
};

const buildUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const withAuthHeader = (init: RequestInit, accessToken: string): RequestInit => {
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${accessToken}`);

  return {
    ...init,
    headers,
  };
};

export const apiFetch = async (
  path: string,
  init: RequestInit = {},
): Promise<Response> => {
  if (!bindings) {
    return fetch(buildUrl(path), init);
  }

  const currentTokens = bindings.getTokens();
  const requestInit = currentTokens?.accessToken
    ? withAuthHeader(init, currentTokens.accessToken)
    : init;

  const firstResponse = await fetch(buildUrl(path), requestInit);
  if (firstResponse.status !== 401 || !currentTokens?.refreshToken) {
    return firstResponse;
  }

  const newAccessToken = await bindings.refreshAccessToken();
  if (!newAccessToken) {
    bindings.onUnauthorized();
    return firstResponse;
  }

  return fetch(buildUrl(path), withAuthHeader(init, newAccessToken));
};
