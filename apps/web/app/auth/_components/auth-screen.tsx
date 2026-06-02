"use client";

import Link from "next/link";
import { useState } from "react";
import { getPublicRuntimeConfig } from "@lumen/config/public";
import type { ChangeEvent, FormEvent } from "react";
import type {
  AuthError,
  AuthErrorCode,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "@lumen/types";

type AuthMode = "login" | "register";

type AuthValues = {
  email: string;
  password: string;
  clinicName: string;
};

type Submission = {
  mode: AuthMode;
  payload: LoginRequest | RegisterRequest;
};

const authErrorCopy: Record<AuthErrorCode, string> = {
  AUTH_MISSING_CREDENTIALS: "Check the required fields and try again.",
  AUTH_INVALID_CREDENTIALS: "The email or password is incorrect.",
  AUTH_TOKEN_EXPIRED: "The current token expired. Request a fresh link and try again.",
  AUTH_TOKEN_INVALID: "The current token is invalid or expired.",
  AUTH_FORBIDDEN: "You do not have permission to complete this action.",
  AUTH_ACCOUNT_LOCKED: "This account is temporarily locked after repeated attempts.",
  AUTH_EMAIL_TAKEN: "That email address is already registered.",
};

const modeCopy: Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
    switchHref: string;
    switchLabel: string;
    switchPrompt: string;
  }
> = {
  login: {
    eyebrow: "Secure access",
    title: "Sign in with a live submission state.",
    description:
      "This screen now posts to the auth API, surfaces failures, and keeps the last request ready for retry.",
    actionLabel: "Sign in",
    switchHref: "/auth/register",
    switchLabel: "Create account",
    switchPrompt: "Need to create the first clinic account?",
  },
  register: {
    eyebrow: "Create access",
    title: "Create the first clinic account with retry-aware feedback.",
    description:
      "Registration follows the same shared request contract, loading state, and error handling as sign in.",
    actionLabel: "Create account",
    switchHref: "/auth/login",
    switchLabel: "Sign in",
    switchPrompt: "Already have access?",
  },
};

const initialValues: AuthValues = {
  email: "",
  password: "",
  clinicName: "",
};

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

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const copy = modeCopy[mode];
  const [values, setValues] = useState<AuthValues>(initialValues);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [notice, setNotice] = useState<string>(copy.description);
  const [details, setDetails] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);

  const updateField =
    (field: keyof AuthValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };

  const submit = async (submission: Submission) => {
    const endpoint = submission.mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    const fallbackCode = submission.mode === "login" ? "AUTH_INVALID_CREDENTIALS" : "AUTH_EMAIL_TAKEN";
    setStatus("loading");
    setNotice(`Submitting ${submission.mode === "login" ? "sign in" : "registration"} request...`);
    setDetails(null);
    setLastSubmission(submission);

    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission.payload),
      });
      const payload = await readJson<LoginResponse | RegisterResponse | AuthError>(response);

      if (!response.ok) {
        const authError = parseAuthError(payload, fallbackCode);
        setStatus("error");
        setNotice(authErrorCopy[authError.error]);
        setDetails(authError.message);
        return;
      }

      const session = (payload as LoginResponse | RegisterResponse | null)?.session;
      const verb = submission.mode === "login" ? "Signed in" : "Account created";
      setStatus("success");
      setNotice(`${verb} successfully.`);
      setDetails(
        session
          ? `Session ready for ${session.userId} at clinic ${session.clinicId}.`
          : `${verb} successfully.`
      );
    } catch {
      setStatus("error");
      setNotice("The auth service could not be reached.");
      setDetails("Check your API base URL and try again.");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload =
      mode === "login"
        ? {
            email: values.email.trim(),
            password: values.password,
          }
        : {
            email: values.email.trim(),
            password: values.password,
            clinicName: values.clinicName.trim(),
          };

    void submit({ mode, payload });
  };

  const retry = () => {
    if (lastSubmission) {
      void submit(lastSubmission);
    }
  };

  const isLoading = status === "loading";

  return (
    <section className="authCard">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p className="authLead">{copy.description}</p>

      <form className="authForm" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="authField">
            Clinic name
            <input
              type="text"
              name="clinicName"
              value={values.clinicName}
              onChange={updateField("clinicName")}
              placeholder="North Star Clinic"
              autoComplete="organization"
              required
              minLength={2}
            />
          </label>
        ) : null}

        <label className="authField">
          Email
          <input
            type="email"
            name="email"
            value={values.email}
            onChange={updateField("email")}
            placeholder="owner@clinic.test"
            autoComplete="email"
            required
          />
        </label>

        <label className="authField">
          Password
          <input
            type="password"
            name="password"
            value={values.password}
            onChange={updateField("password")}
            placeholder="********"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
          />
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? `${copy.actionLabel}...` : copy.actionLabel}
        </button>
      </form>

      <div className={`authStatus authStatus--${status}`} aria-live="polite">
        <p>{notice}</p>
        {details ? <p className="authStatusDetail">{details}</p> : null}
        {status === "error" && lastSubmission ? (
          <button type="button" className="authRetry" onClick={retry}>
            Retry last request
          </button>
        ) : null}
      </div>

      <div className="authFooter">
        <p>{copy.switchPrompt}</p>
        <Link href={copy.switchHref} className="authSwitchLink">
          {copy.switchLabel}
        </Link>
      </div>
    </section>
  );
}
