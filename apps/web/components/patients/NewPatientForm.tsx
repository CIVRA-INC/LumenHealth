"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiFetch } from "@/lib/api-client";
import type { Patient } from "@lumen/types";

const patientFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z.string().datetime("Provide a valid date"),
  sex: z.enum(["M", "F", "O"]),
  contactNumber: z.string().trim().min(5, "Contact number is required"),
  address: z.string().trim().min(3, "Address is required"),
});

type PatientFormInput = z.infer<typeof patientFormSchema>;

export const NewPatientForm = () => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PatientFormInput>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      sex: "M",
      contactNumber: "",
      address: "",
    },
  });

  const onSubmit = async (input: PatientFormInput) => {
    setApiError(null);
    setCreatedPatient(null);

    const response = await apiFetch("/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      setApiError("Unable to create patient.");
      return;
    }

    const payload = (await response.json()) as { data?: Patient };
    if (payload.data) {
      setCreatedPatient(payload.data);
    }

    reset();
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
        New Patient Registration
      </h2>
      <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="text-xs font-medium text-slate-700">First Name</label>
          <input
            {...register("firstName")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Amina"
          />
          {errors.firstName ? (
            <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Last Name</label>
          <input
            {...register("lastName")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Kato"
          />
          {errors.lastName ? (
            <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Date of Birth (ISO)</label>
          <input
            {...register("dateOfBirth")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="1994-01-03T00:00:00.000Z"
          />
          {errors.dateOfBirth ? (
            <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth.message}</p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Sex</label>
          <select
            {...register("sex")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="M">Male (M)</option>
            <option value="F">Female (F)</option>
            <option value="O">Other (O)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Contact Number</label>
          <input
            {...register("contactNumber")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="+256-700-000-000"
          />
          {errors.contactNumber ? (
            <p className="mt-1 text-xs text-red-600">{errors.contactNumber.message}</p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Address</label>
          <input
            {...register("address")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Kampala"
          />
          {errors.address ? (
            <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            data-primary-action="true"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Create Patient"}
          </button>
        </div>
      </form>

      {apiError ? (
        <p className="mt-3 text-sm text-red-700">{apiError}</p>
      ) : null}

      {createdPatient ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Patient created: {createdPatient.firstName} {createdPatient.lastName} (
          {createdPatient.systemId})
        </p>
      ) : null}
    </section>
  );
};
