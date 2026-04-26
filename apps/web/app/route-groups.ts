/**
 * CHORD-061 – Route group definitions for the Next.js app shell.
 * Separates public, authenticated-artist, authenticated-fan, and admin experiences.
 */

export type RouteGroup = "public" | "artist" | "fan" | "admin";

export interface RouteConfig {
  group: RouteGroup;
  path: string;
  /** Whether the route requires an active session */
  protected: boolean;
  /** Roles allowed; empty means any authenticated user */
  roles: RouteGroup[];
}

export const routes: RouteConfig[] = [
  { group: "public", path: "/",            protected: false, roles: [] },
  { group: "public", path: "/login",       protected: false, roles: [] },
  { group: "public", path: "/signup",      protected: false, roles: [] },
  { group: "artist", path: "/studio",      protected: true,  roles: ["artist"] },
  { group: "artist", path: "/studio/tracks", protected: true, roles: ["artist"] },
  { group: "fan",    path: "/feed",        protected: true,  roles: ["fan"] },
  { group: "fan",    path: "/tip",         protected: true,  roles: ["fan"] },
  { group: "admin",  path: "/admin",       protected: true,  roles: ["admin"] },
  { group: "admin",  path: "/admin/users", protected: true,  roles: ["admin"] },
];

/**
 * Returns the route config for a given pathname, or null if not found.
 */
export function matchRoute(pathname: string): RouteConfig | null {
  return routes.find((r) => pathname === r.path || pathname.startsWith(r.path + "/")) ?? null;
}

/**
 * Returns true when the user's role is permitted to access the route.
 */
export function canAccess(route: RouteConfig, userRole: RouteGroup | null): boolean {
  if (!route.protected) return true;
  if (!userRole) return false;
  if (route.roles.length === 0) return true;
  return route.roles.includes(userRole);
}

/**
 * Resolves the redirect target when access is denied.
 */
export function denyRedirect(userRole: RouteGroup | null): string {
  if (!userRole) return "/login";
  if (userRole === "admin") return "/admin";
  if (userRole === "artist") return "/studio";
  return "/feed";
}
