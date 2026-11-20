export type PublicRuntimeConfig = {
  apiBaseUrl: string;
};

const DEV_API_BASE_URL = "http://localhost:4000";

/**
 * Validates and normalizes the browser-visible API base URL: it must parse as
 * an http(s) URL, and a trailing slash is removed so callers can append
 * `/path` without producing `//`.
 */
function normalizeApiBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `[config] NEXT_PUBLIC_API_BASE_URL is not a valid URL: "${raw}" (expected e.g. https://api.example.com)`,
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `[config] NEXT_PUBLIC_API_BASE_URL must use http or https, got "${url.protocol}"`,
    );
  }
  return raw.replace(/\/+$/, "");
}

export const getPublicRuntimeConfig = (): PublicRuntimeConfig => {
  // Next.js inlines NEXT_PUBLIC_* at build time, so keep this a literal access.
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[config] NEXT_PUBLIC_API_BASE_URL is required in production — refusing to fall back to localhost",
      );
    }
    return { apiBaseUrl: DEV_API_BASE_URL };
  }

  return { apiBaseUrl: normalizeApiBaseUrl(raw) };
};
