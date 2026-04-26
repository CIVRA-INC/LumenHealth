/**
 * CHORD-071 – Production navigation architecture for the Expo app.
 * Separates auth, fan, artist, and settings stacks so each domain
 * can evolve independently without forking shared layout primitives.
 */
import { NavigationContainerRef } from "@react-navigation/native";
import { createRef } from "react";

// ── Stack param lists ────────────────────────────────────────────────────────

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type FanStackParams = {
  FanHome: undefined;
  ArtistProfile: { artistId: string };
  LiveSession: { sessionId: string };
  Tip: { sessionId: string; artistId: string };
};

export type ArtistStackParams = {
  ArtistDashboard: undefined;
  GoLive: undefined;
  Earnings: undefined;
  EditProfile: undefined;
};

export type SettingsStackParams = {
  Settings: undefined;
  Notifications: undefined;
  Security: undefined;
  About: undefined;
};

export type RootStackParams = {
  Auth: undefined;
  Fan: undefined;
  Artist: undefined;
  Settings: undefined;
};

// ── Navigation ref (imperative navigation outside React tree) ────────────────

export const navigationRef = createRef<NavigationContainerRef<RootStackParams>>();

export function navigate<K extends keyof RootStackParams>(
  screen: K,
  params?: RootStackParams[K]
) {
  navigationRef.current?.navigate(screen, params as never);
}

export function resetToAuth() {
  navigationRef.current?.reset({ index: 0, routes: [{ name: "Auth" }] });
}

// ── Route guards ─────────────────────────────────────────────────────────────

export type UserRole = "fan" | "artist" | "guest";

export function rootScreenForRole(role: UserRole): keyof RootStackParams {
  if (role === "artist") return "Artist";
  if (role === "fan") return "Fan";
  return "Auth";
}
