"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/providers/AuthProvider";

const onboardingSchema = z.object({
  clinicName: z
    .string()
    .trim()
    .min(2, "Clinic name must be at least 2 characters."),
  location: z
    .string()
    .trim()
    .min(2, "Location is required."),
  contactNumber: z
    .string()
    .trim()
    .min(7, "Contact number is required."),
  adminName: z
    .string()
    .trim()
    .min(2, "Admin name must be at least 2 characters."),
  adminEmail: z
    .string()
    .email("Please enter a valid email address."),
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long."),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

type Toast = {
  tone: "error" | "warning";
  message: string;
};

const stepFields: Array<Array<keyof OnboardingForm>> = [
  ["clinicName", "location", "contactNumber"],
  ["adminName", "adminEmail", "adminPassword"],
];

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function RegisterPage() {
  const router = useRouter();
  const { startSession } = useAuth();

  const [step, setStep] = useState<0 | 1>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    shouldUnregister: false,
    defaultValues: {
      clinicName: "",
      location: "",
      contactNumber: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    },
  });

  const stepTitle = useMemo(
    () =>
      step === 0 ? "Clinic Profile" : "Admin Account Setup",
    [step],
  );

  const onNextStep = async () => {
    const isStepValid = await trigger(stepFields[step], { shouldFocus: true });
    if (!isStepValid) {
      return;
    }

    setStep(1);
  };

  const onBackStep = () => setStep(0);

  const onSubmit = handleSubmit(async (values) => {
    setToast(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/clinics/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: values.clinicName,
          adminEmail: values.adminEmail,
          adminPassword: values.adminPassword,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          setToast({
            tone: "error",
            message: "Registration failed. Admin email may already be in use.",
          });
          return;
        }

        if (response.status >= 500) {
          setToast({
            tone: "warning",
            message: "Server unavailable. Please try again shortly.",
          });
          return;
        }

        setToast({
          tone: "error",
          message: "Unable to complete setup. Please review your inputs.",
        });
        return;
      }

      const payload = (await response.json()) as {
        data?: { accessToken?: string; refreshToken?: string };
      };

      const accessToken = payload.data?.accessToken;
      const refreshToken = payload.data?.refreshToken;
      if (!accessToken || !refreshToken) {
        setToast({
          tone: "error",
          message: "Invalid server response. Please retry.",
        });
        return;
      }

      startSession({ accessToken, refreshToken });
      router.replace("/dashboard");
    } catch {
      setToast({
        tone: "warning",
        message: "Network error. Check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            LumenHealth Onboarding
          </p>
          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{stepTitle}</h1>
              <p className="mt-1 text-sm text-slate-600">Step {step + 1} of 2</p>
            </div>
            <div className="flex w-full max-w-xs gap-2">
              <div
                className={`h-2 flex-1 rounded-full ${step >= 0 ? "bg-teal-700" : "bg-slate-200"}`}
              />
              <div
                className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-teal-700" : "bg-slate-200"}`}
              />
            </div>
          </div>
        </header>

        <form className="space-y-8" onSubmit={onSubmit} noValidate>
          {step === 0 ? (
            <section className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="clinicName">
                  Clinic Name
                </label>
                <input
                  id="clinicName"
                  {...register("clinicName")}
                  placeholder="e.g. Sunrise Community Clinic"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                {errors.clinicName ? (
                  <p className="text-xs font-medium text-red-600">{errors.clinicName.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  {...register("location")}
                  placeholder="City, Region"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                {errors.location ? (
                  <p className="text-xs font-medium text-red-600">{errors.location.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-800"
                  htmlFor="contactNumber"
                >
                  Contact Number
                </label>
                <input
                  id="contactNumber"
                  {...register("contactNumber")}
                  placeholder="+1 555 000 1234"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                {errors.contactNumber ? (
                  <p className="text-xs font-medium text-red-600">
                    {errors.contactNumber.message}
                  </p>
                ) : null}
              </div>
            </section>
          ) : (
            <section className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="adminName">
                  Admin Name
                </label>
                <input
                  id="adminName"
                  {...register("adminName")}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                {errors.adminName ? (
                  <p className="text-xs font-medium text-red-600">{errors.adminName.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="adminEmail">
                  Admin Email
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  {...register("adminEmail")}
                  placeholder="admin@clinic.org"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                {errors.adminEmail ? (
                  <p className="text-xs font-medium text-red-600">{errors.adminEmail.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-800"
                  htmlFor="adminPassword"
                >
                  Password
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  {...register("adminPassword")}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                {errors.adminPassword ? (
                  <p className="text-xs font-medium text-red-600">
                    {errors.adminPassword.message}
                  </p>
                ) : null}
              </div>
            </section>
          )}

          {toast ? (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                toast.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
              role="status"
              aria-live="polite"
            >
              {toast.message}
            </div>
          ) : null}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
            {step === 0 ? (
              <div className="text-xs text-slate-500">You can review details before completing setup.</div>
            ) : (
              <button
                type="button"
                onClick={onBackStep}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                disabled={isSubmitting}
              >
                Back
              </button>
            )}

            {step === 0 ? (
              <button
                type="button"
                onClick={onNextStep}
                className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Completing Setup..." : "Complete Setup"}
              </button>
            )}
          </footer>
        </form>
      </div>
    </main>
  );
}
