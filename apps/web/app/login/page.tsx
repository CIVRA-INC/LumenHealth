"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AuthError, useAuth } from "@/providers/AuthProvider";

type Toast = {
  id: string;
  tone: "success" | "error" | "warning";
  title: string;
  message: string;
};

type AuthMode = "login" | "forgot";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long."),
});

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

const toneClassMap: Record<Toast["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

const Spinner = () => (
  <span
    aria-hidden="true"
    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
  />
);

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtitle = useMemo(() => {
    if (mode === "forgot") {
      return "Enter your work email and we will send a reset link.";
    }

    return "Sign in to continue to the clinic dashboard.";
  }, [mode]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setToasts((previous) => previous.slice(1));
    }, 3500);

    return () => clearTimeout(timeout);
  }, [toasts]);

  const pushToast = (toast: Omit<Toast, "id">) => {
    setToasts((previous) => [
      ...previous,
      {
        ...toast,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    ]);
  };

  const resetErrors = () => setFormErrors({});

  const onLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetErrors();

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const issues: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path.length > 0) {
          issues[String(issue.path[0])] = issue.message;
        }
      }

      setFormErrors(issues);
      return;
    }

    setIsSubmitting(true);

    try {
      await login(result.data);
      router.replace("/dashboard");
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.code === "INVALID_CREDENTIALS") {
          pushToast({
            tone: "error",
            title: "Invalid Credentials",
            message: "Email or password is incorrect.",
          });
          return;
        }

        if (error.code === "NETWORK") {
          pushToast({
            tone: "warning",
            title: "Network Error",
            message: "Connection problem. Please retry when online.",
          });
          return;
        }

        pushToast({
          tone: "error",
          title: "Sign In Failed",
          message: error.message,
        });
        return;
      }

      pushToast({
        tone: "error",
        title: "Unexpected Error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetErrors();

    const result = forgotSchema.safeParse({ email });
    if (!result.success) {
      const issues: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path.length > 0) {
          issues[String(issue.path[0])] = issue.message;
        }
      }

      setFormErrors(issues);
      return;
    }

    setIsSubmitting(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

      const response = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 501) {
          pushToast({
            tone: "warning",
            title: "Reset Unavailable",
            message: "Password reset will be enabled in the next backend update.",
          });
          return;
        }

        pushToast({
          tone: "error",
          title: "Request Failed",
          message: "Unable to send reset link. Please try again.",
        });
        return;
      }

      pushToast({
        tone: "success",
        title: "Reset Link Sent",
        message: "Check your email for password reset instructions.",
      });
      setMode("login");
    } catch {
      pushToast({
        tone: "warning",
        title: "Network Error",
        message: "Connection problem. Please retry when online.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              LumenHealth
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === "login" ? "Sign In" : "Reset Password"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          </header>

          <form
            className="space-y-5"
            onSubmit={mode === "login" ? onLoginSubmit : onForgotSubmit}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@clinic.org"
                autoComplete="email"
              />
              {formErrors.email ? (
                <p className="text-xs font-medium text-red-600">{formErrors.email}</p>
              ) : null}
            </div>

            {mode === "login" ? (
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-800"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                {formErrors.password ? (
                  <p className="text-xs font-medium text-red-600">{formErrors.password}</p>
                ) : null}
              </div>
            ) : null}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner /> : null}
              {isSubmitting
                ? mode === "login"
                  ? "Signing In..."
                  : "Sending Link..."
                : mode === "login"
                  ? "Sign In"
                  : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            {mode === "login" ? (
              <button
                type="button"
                className="font-medium text-teal-700 hover:text-teal-800"
                onClick={() => {
                  setMode("forgot");
                  resetErrors();
                }}
              >
                Forgot Password?
              </button>
            ) : (
              <button
                type="button"
                className="font-medium text-teal-700 hover:text-teal-800"
                onClick={() => {
                  setMode("login");
                  resetErrors();
                }}
              >
                Back to Sign In
              </button>
            )}
            <span className="text-xs text-slate-500">Secure clinic access</span>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-sm ${toneClassMap[toast.tone]}`}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="mt-0.5 text-xs">{toast.message}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
