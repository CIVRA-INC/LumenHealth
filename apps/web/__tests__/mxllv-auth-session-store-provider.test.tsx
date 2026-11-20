import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AuthSession } from "@lumen/types";

vi.mock("../app/auth/session", () => {
  let session: AuthSession | null = null;
  const listeners = new Set<() => void>();
  return {
    getStoredAuthSession: () => session,
    getServerAuthSession: () => null,
    subscribeToAuthSession: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
    setStoredAuthSession: (s: AuthSession) => { session = s; listeners.forEach((l) => l()); },
    clearStoredAuthSession: () => { session = null; listeners.forEach((l) => l()); },
  };
});

import { AuthSessionProvider, useAuthSession } from "../app/auth/session-provider";

function Probe() {
  const { session } = useAuthSession();
  return <div data-testid="uid">{session?.userId ?? "none"}</div>;
}

describe("mxllv auth session store and provider", () => {
  beforeEach(() => {
    // module mock holds state per test run in this isolated helper test
  });

  it("provides null session by default and renders children", () => {
    render(<AuthSessionProvider><Probe /></AuthSessionProvider>);
    expect(screen.getByTestId("uid").textContent).toBe("none");
  });

  it("throws when hook used outside provider", () => {
    function Bad() { useAuthSession(); return null; }
    expect(() => render(<Bad />)).toThrow(/AuthSessionProvider/);
  });
});
