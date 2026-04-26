"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Role = "artist" | "admin";

interface RouteGuardProps {
  role: Role;
  children: React.ReactNode;
}

function getSession(): { role: Role | null; returnPath?: string } {
  if (typeof window === "undefined") return { role: null };
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith("session="))
      ?.split("=")[1];
    return raw ? JSON.parse(decodeURIComponent(raw)) : { role: null };
  } catch {
    return { role: null };
  }
}

/**
 * Wraps a page and redirects unauthorized users to /login,
 * preserving the return path as a query param.
 */
export default function RouteGuard({ role, children }: RouteGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session.role || session.role !== role) {
      const returnTo = encodeURIComponent(window.location.pathname);
      router.replace(`/login?returnTo=${returnTo}`);
    }
  }, [role, router]);

  const session = getSession();
  if (!session.role || session.role !== role) return null;

  return <>{children}</>;
}

// Usage:
// <RouteGuard role="admin"><AdminPage /></RouteGuard>
// <RouteGuard role="artist"><ArtistDashboard /></RouteGuard>
