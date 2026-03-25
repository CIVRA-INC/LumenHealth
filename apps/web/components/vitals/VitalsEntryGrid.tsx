"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";

const vitalsSchema = z.object({
  encounterId: z.string().trim().min(1),
  bpSystolic: z.number().min(30).max(300),
  bpDiastolic: z.number().min(20).max(200),
  heartRate: z.number().min(20).max(260),
  temperature: z.number().min(30).max(45),
  respirationRate: z.number().min(5).max(80),
  spO2: z.number().min(40).max(100),
  weight: z.number().min(1).max(500),
});

type VitalsFormInput = z.infer<typeof vitalsSchema>;

type VitalsResponse = {
  id: string;
  encounterId: string;
  flags: string[];
};

const getTempSignal = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) {
    return {
      tone: "normal" as const,
      message: "",
      className: "border-slate-300 focus:border-teal-600 focus:ring-teal-100",
    };
  }

  if (value >= 39) {
    return {
      tone: "critical" as const,
      message: "CRITICAL FEVER - ALERT DOCTOR",
      className: "border-red-500 bg-red-50 text-red-900 focus:border-red-600 focus:ring-red-100",
    };
  }

  if (value > 37.5) {
    return {
      tone: "warning" as const,
      message: "Mild Fever",
      className:
        "border-amber-500 bg-amber-50 text-amber-900 focus:border-amber-600 focus:ring-amber-100",
    };
  }

  return {
    tone: "normal" as const,
    message: "Normal range",
    className: "border-emerald-500 bg-emerald-50 text-emerald-900 focus:border-emerald-600 focus:ring-emerald-100",
  };
};

import { useEncounter } from "@/providers/EncounterProvider";

export const VitalsEntryGrid = () => {
  const { activeEncounterId } = useEncounter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<VitalsResponse | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<VitalsFormInput>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      encounterId: activeEncounterId ?? "mock-enc-123",
      bpSystolic: 120,
      bpDiastolic: 80,
      heartRate: 78,
      temperature: 36.8,
      respirationRate: 16,
      spO2: 98,
      weight: 70,
    },
  });

  useEffect(() => {
    if (activeEncounterId) {
      setValue("encounterId", activeEncounterId);
    }
  }, [activeEncounterId, setValue]);

  const watchedTemperature = watch("temperature");
  const tempSignal = useMemo(
    () => getTempSignal(typeof watchedTemperature === "number" ? watchedTemperature : undefined),
    [watchedTemperature],
  );

  const onSubmit = handleSubmit(async (input) => {
    setApiError(null);
    setSuccessState(null);

    try {
      const response = await apiFetch("/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setApiError(payload?.message ?? "Failed to save vitals.");
        return;
      }

      const payload = (await response.json()) as { data?: VitalsResponse };
      if (payload.data) {
        setSuccessState(payload.data);
      }

      reset({ ...input });
    } catch {
      setApiError("Network error while saving vitals.");
    }
  });

  const sharedInputClass =
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Fast-Entry Vitals</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter vitals rapidly with real-time risk feedback before submission.
        </p>
      </header>

      <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={onSubmit}>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
          Encounter ID
          <input {...register("encounterId")} className={`${sharedInputClass} border-slate-300`} />
        </label>

        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
          BP Systolic
          <input
            type="number"
            step="1"
            {...register("bpSystolic", { valueAsNumber: true })}
            className={`${sharedInputClass} border-slate-300`}
          />
          {errors.bpSystolic ? (
            <span className="mt-1 block text-xs text-red-600">Invalid systolic value</span>
          ) : null}
        </label>

        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
          BP Diastolic
          <input
            type="number"
            step="1"
            {...register("bpDiastolic", { valueAsNumber: true })}
            className={`${sharedInputClass} border-slate-300`}
          />
          {errors.bpDiastolic ? (
            <span className="mt-1 block text-xs text-red-600">Invalid diastolic value</span>
          ) : null}
        </label>

        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
          Heart Rate
          <input
            type="number"
            step="1"
            {...register("heartRate", { valueAsNumber: true })}
            className={`${sharedInputClass} border-slate-300`}
          />
          {errors.heartRate ? (
            <span className="mt-1 block text-xs text-red-600">Invalid heart rate</span>
          ) : null}
        </label>

        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
          Temperature (°C)
          <input
            type="number"
            step="0.1"
            {...register("temperature", { valueAsNumber: true })}
            className={`${sharedInputClass} ${tempSignal.className}`}
          />
          {errors.temperature ? (
            <span className="mt-1 block text-xs text-red-600">Invalid temperature value</span>
          ) : tempSignal.message ? (
            <span
              className={`mt-1 block text-xs font-semibold ${
                tempSignal.tone === "critical"
                  ? "text-red-700"
                  : tempSignal.tone === "warning"
                    ? "text-amber-700"
                    : "text-emerald-700"
              }`}
            >
              {tempSignal.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
          Respiration Rate
          <input
            type="number"
            step="1"
            {...register("respirationRate", { valueAsNumber: true })}
            className={`${sharedInputClass} border-slate-300`}
          />
          {errors.respirationRate ? (
            <span className="mt-1 block text-xs text-red-600">Invalid respiration rate</span>
          ) : null}
        </label>

        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
          SpO2 (%)
          <input
            type="number"
            step="1"
            {...register("spO2", { valueAsNumber: true })}
            className={`${sharedInputClass} border-slate-300`}
          />
          {errors.spO2 ? <span className="mt-1 block text-xs text-red-600">Invalid SpO2</span> : null}
        </label>

        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
          Weight (kg)
          <input
            type="number"
            step="0.1"
            {...register("weight", { valueAsNumber: true })}
            className={`${sharedInputClass} border-slate-300`}
          />
          {errors.weight ? (
            <span className="mt-1 block text-xs text-red-600">Invalid weight</span>
          ) : null}
        </label>

        <div className="md:col-span-2 lg:col-span-4">
          <button
            type="submit"
            data-primary-action="true"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving Vitals..." : "Save Vitals"}
          </button>
        </div>
      </form>

      {apiError ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {apiError}
        </p>
      ) : null}

      {successState ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>
            Vitals saved for encounter <strong>{successState.encounterId}</strong>.
          </p>
          <p className="mt-1 text-xs">
            Flags: {successState.flags.length ? successState.flags.join(", ") : "None"}
          </p>
        </div>
      ) : null}
    </section>
  );
};
