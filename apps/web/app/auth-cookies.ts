/**
 * CHORD-064 – Cookie-based auth integration for server and client components.
 * Provides SSR-safe session reads and mutation actions.
 */

import { cookies } from "next/headers";

const SESSION_COOKIE = "lumen_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface Session {
  userId: string;
  role: "artist" | "fan" | "admin";
  expiresAt: number;
}

/** SERVER: read the current session from the request cookie store. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const session: Session = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** SERVER ACTION: write a new session cookie after successful sign-in. */
export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  const encoded = Buffer.from(JSON.stringify(session)).toString("base64");
  store.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/** SERVER ACTION: clear the session cookie on sign-out. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** CLIENT: lightweight helper to check auth state without a server round-trip. */
export function isAuthCookiePresent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
}
