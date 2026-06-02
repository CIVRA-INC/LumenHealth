"use client";

// Closes #525
import { useState } from "react";
import type { LoginRequest, LoginResponse, AuthError } from "@lumen/types";

type DemoState = "idle" | "loading" | "success" | "error" | "locked";

const DEMO_STATES: { label: string; state: DemoState }[] = [
  { label: "Idle", state: "idle" },
  { label: "Loading", state: "loading" },
  { label: "Success", state: "success" },
  { label: "Error", state: "error" },
  { label: "Locked", state: "locked" },
];

const DEMO_SESSION = {
  userId: "demo-user",
  clinicId: "demo-clinic",
  role: "owner" as const,
  accessToken: "demo.jwt.token",
};

export default function LoginPage() {
  const [uiState, setUiState] = useState<DemoState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (demoMode) return;
    const form = new FormData(e.currentTarget);
    const body: LoginRequest = {
      email: form.get("email") as string,
      password: form.get("password") as string,
    };
    setUiState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data: LoginResponse = await res.json();
        void data; // store token in real implementation
        setUiState("success");
      } else {
        const err: AuthError = await res.json();
        if (err.error === "AUTH_ACCOUNT_LOCKED") setUiState("locked");
        else setUiState("error");
        setErrorMsg(err.message);
      }
    } catch {
      setUiState("error");
      setErrorMsg("Network error — could not reach the server.");
    }
  }

  function activateDemoState(state: DemoState) {
    setDemoMode(true);
    setUiState(state);
    if (state === "error") setErrorMsg("Invalid email or password.");
    else if (state === "locked") setErrorMsg("Account locked after too many attempts.");
    else setErrorMsg(null);
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <p className="eyebrow">Milestone 1 · Authentication</p>
        <h1>Sign in to LumenHealth</h1>

        {uiState === "success" && (
          <div role="status" className="authSuccess">
            <p>Signed in as <strong>{DEMO_SESSION.role}</strong> — redirecting…</p>
          </div>
        )}

        {(uiState === "error" || uiState === "locked") && errorMsg && (
          <div role="alert" className="authError">
            <p>{errorMsg}</p>
          </div>
        )}

        <form className="authForm" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              placeholder="owner@clinic.test"
              autoComplete="email"
              disabled={uiState === "loading" || uiState === "success"}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={uiState === "loading" || uiState === "success"}
              required
            />
          </label>
          <button
            type="submit"
            disabled={uiState === "loading" || uiState === "success"}
            aria-busy={uiState === "loading"}
          >
            {uiState === "loading" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Demo state switcher — visible only in development for hackathon screenshots */}
        {process.env.NODE_ENV !== "production" && (
          <div className="demoStates" aria-label="Demo state switcher">
            <p className="eyebrow">Demo states</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {DEMO_STATES.map(({ label, state }) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => activateDemoState(state)}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
