"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { AuthError, AuthErrorCode, RegisterRequest, RegisterResponse } from "@lumen/types";

type RegistrationValues = {
  clinicName: string;
  email: string;
  password: string;
};

type SubmitState = "idle" | "loading" | "success" | "error";

const initialValues: RegistrationValues = {
  clinicName: "",
  email: "",
  password: "",
};

const authErrorCopy: Record<AuthErrorCode, string> = {
  AUTH_MISSING_CREDENTIALS: "Fill in the required fields and try again.",
  AUTH_INVALID_CREDENTIALS: "The submitted details are invalid.",
  AUTH_TOKEN_EXPIRED: "The signup token expired. Start over and try again.",
  AUTH_TOKEN_INVALID: "The signup token is invalid.",
  AUTH_FORBIDDEN: "You do not have permission to complete this action.",
  AUTH_ACCOUNT_LOCKED: "This account is temporarily locked after repeated attempts.",
  AUTH_EMAIL_TAKEN: "That email address already has an account.",
};

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:4000";
}

function parseAuthError(body: unknown, fallbackCode: AuthErrorCode): AuthError {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    "message" in body &&
    typeof (body as { error?: unknown }).error === "string" &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    const code = (body as { error: string }).error;
    if (code in authErrorCopy) {
      return body as AuthError;
    }
  }

  return {
    error: fallbackCode,
    message: authErrorCopy[fallbackCode],
  };
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function RegisterPage() {
  const [values, setValues] = useState<RegistrationValues>(initialValues);
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string>("Create the first clinic owner account.");
  const [details, setDetails] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<RegisterRequest | null>(null);

  const updateField =
    (field: keyof RegistrationValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };

  const submit = async (payload: RegisterRequest) => {
    setStatus("loading");
    setMessage("Creating clinic owner account...");
    setDetails(null);
    setLastSubmission(payload);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await readJson<RegisterResponse | AuthError>(response);

      if (!response.ok) {
        const authError = parseAuthError(body, "AUTH_EMAIL_TAKEN");
        setStatus("error");
        setMessage(authErrorCopy[authError.error]);
        setDetails(authError.message);
        return;
      }

      const session = (body as RegisterResponse | null)?.session;
      setStatus("success");
      setMessage("Clinic owner account created.");
      setDetails(
        session
          ? `Session ready for ${session.userId} at clinic ${session.clinicId}. Continue to sign in when you are ready.`
          : "Continue to sign in when you are ready."
      );
    } catch {
      setStatus("error");
      setMessage("The auth service could not be reached.");
      setDetails("Check your API base URL and try again.");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void submit({
      clinicName: values.clinicName.trim(),
      email: values.email.trim(),
      password: values.password,
    });
  };

  const retry = () => {
    if (lastSubmission) {
      void submit(lastSubmission);
    }
  };

  const isLoading = status === "loading";

  return (
    <main className="authPage">
      <section className="authCard">
        <p className="eyebrow">Clinic owner signup</p>
        <h1>Create the first account for your clinic.</h1>
        <p className="authLead">
          The registration form now submits to the auth API, shows loading and failure states,
          and keeps the last request ready for retry.
        </p>

        <form className="authForm" onSubmit={handleSubmit}>
          <label>
            Clinic name
            <input
              type="text"
              value={values.clinicName}
              onChange={updateField("clinicName")}
              placeholder="North Star Clinic"
              autoComplete="organization"
              required
              minLength={2}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={values.email}
              onChange={updateField("email")}
              placeholder="owner@clinic.test"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={values.password}
              onChange={updateField("password")}
              placeholder="********"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className={`authStatus authStatus--${status}`} aria-live="polite">
          <p>{message}</p>
          {details ? <p>{details}</p> : null}
          {status === "error" && lastSubmission ? (
            <button type="button" className="authRetry" onClick={retry}>
              Retry last request
            </button>
          ) : null}
        </div>

        <div className="authFooter">
          <Link href="/auth/login" className="primary">
            Sign in instead
          </Link>
          <Link href="/" className="secondary">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
