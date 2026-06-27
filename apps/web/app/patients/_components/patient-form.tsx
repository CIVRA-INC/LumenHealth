"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Link from "next/link";
import type {
  CreatePatientRequest,
  Patient,
  UpdatePatientRequest,
  PatientErrorCode,
} from "@lumen/types";
import { usePatientApi } from "../_lib/use-patient-api";
import { validateCreateForm, validateUpdateForm } from "../_lib/validate-client";
import { parsePatientError, patientErrorCopy } from "../_lib/error-copy";

type FormStatus = "idle" | "loading" | "success" | "error";
type FieldErrors = Partial<Record<string, string>>;

const initialCreateValues: Record<string, string> = {
  identifier: "",
  givenName: "",
  familyName: "",
  birthDate: "",
  phone: "",
  email: "",
  address: "",
};

type PatientFormProps = {
  mode: "create" | "edit";
  initial?: Patient;
  onSuccess: (saved: Patient) => void;
};

export function PatientForm({ mode, initial, onSuccess }: PatientFormProps) {
  const { fetchApi } = usePatientApi();
  const [values, setValues] = useState<Record<string, string>>(
    mode === "create"
      ? { ...initialCreateValues }
      : {
          givenName: initial?.givenName ?? "",
          familyName: initial?.familyName ?? "",
          phone: initial?.phone ?? "",
          email: initial?.email ?? "",
          address: initial?.address ?? "",
          status: initial?.status ?? "active",
        },
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<FormStatus>("idle");
  const [notice, setNotice] = useState<string>(
    mode === "create"
      ? "Fill the fields to create a patient."
      : "Edit a patient record. Identifier is locked.",
  );
  const [details, setDetails] = useState<string | null>(null);

  function updateField(field: string) {
    return (
      event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
      const next = event.target.value;
      setValues((current) => ({ ...current, [field]: next }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation =
      mode === "create" ? validateCreateForm(values) : validateUpdateForm(values);
    if (!validation.ok) {
      setFieldErrors({ [validation.field]: validation.message });
      setStatus("error");
      setNotice(patientErrorCopy.PATIENT_INVALID_INPUT);
      setDetails(validation.message);
      return;
    }

    setStatus("loading");
    setNotice(mode === "create" ? "Saving new patient..." : "Saving changes...");
    setDetails(null);

    void (async () => {
      const endpoint =
        mode === "create"
          ? "/api/v1/patients"
          : `/api/v1/patients/${encodeURIComponent(initial?.patientId ?? "")}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body =
        mode === "create"
          ? (trimPayload(values) as CreatePatientRequest)
          : (pickPatch(values) as UpdatePatientRequest);
      const result = await fetchApi<{ patient?: Patient }>(endpoint, {
        method,
        body: JSON.stringify(body),
      });
      if (result.unauthorized) {
        setStatus("error");
        setNotice("Your session expired. Redirecting to sign-in...");
        return;
      }
      if (result.ok && result.body?.patient) {
        setStatus("success");
        setNotice(mode === "create" ? "Patient created." : "Patient updated.");
        setDetails(null);
        onSuccess(result.body.patient);
        return;
      }
      if (result.status === 400) {
        const err = parsePatientError(
          result.body,
          "PATIENT_INVALID_INPUT" as PatientErrorCode,
        );
        if (err.field) {
          setFieldErrors({ [err.field]: err.message });
        }
        setStatus("error");
        setNotice(patientErrorCopy[err.error]);
        setDetails(err.message);
        return;
      }
      const fallback: PatientErrorCode =
        mode === "create"
          ? "PATIENT_IDENTIFIER_TAKEN"
          : "PATIENT_NOT_FOUND";
      const err = parsePatientError(result.body, fallback);
      setStatus("error");
      setNotice(patientErrorCopy[err.error]);
      setDetails(err.message);
    })();
  }

  const isLoading = status === "loading";
  const title = mode === "create" ? "New patient" : "Edit patient";
  const actionLabel = mode === "create" ? "Create patient" : "Save changes";

  return (
    <section className="patientCard">
      <div className="patientCardContent">
        <p className="eyebrow">Patient records</p>
        <h1>{title}</h1>
        <p className="lede">
          {mode === "create"
            ? "Create a patient record for this clinic."
            : `Editing patient ${initial?.identifier ?? ""}.`}
        </p>
      </div>

      <form className="authForm" onSubmit={handleSubmit} noValidate>
        {mode === "create" ? (
          <PatientField field="identifier" label="Medical record number" error={fieldErrors.identifier}>
            <input
              type="text"
              name="identifier"
              value={values.identifier}
              onChange={updateField("identifier")}
              placeholder="MRN-001"
              autoComplete="off"
              maxLength={240}
            />
          </PatientField>
        ) : null}

        <PatientField field="givenName" label="Given name" error={fieldErrors.givenName}>
          <input
            type="text"
            name="givenName"
            value={values.givenName}
            onChange={updateField("givenName")}
            placeholder="Ada"
            autoComplete="given-name"
            maxLength={120}
          />
        </PatientField>

        <PatientField field="familyName" label="Family name" error={fieldErrors.familyName}>
          <input
            type="text"
            name="familyName"
            value={values.familyName}
            onChange={updateField("familyName")}
            placeholder="Lovelace"
            autoComplete="family-name"
            maxLength={120}
          />
        </PatientField>

        {mode === "create" ? (
          <PatientField field="birthDate" label="Date of birth" error={fieldErrors.birthDate}>
            <input
              type="date"
              name="birthDate"
              value={values.birthDate}
              onChange={updateField("birthDate")}
              pattern="\d{4}-\d{2}-\d{2}"
            />
          </PatientField>
        ) : null}

        <PatientField field="phone" label="Phone" error={fieldErrors.phone}>
          <input
            type="tel"
            name="phone"
            value={values.phone}
            onChange={updateField("phone")}
            placeholder="+441234567890"
            autoComplete="tel"
            minLength={5}
            maxLength={32}
          />
        </PatientField>

        <PatientField field="email" label="Email" error={fieldErrors.email}>
          <input
            type="email"
            name="email"
            value={values.email}
            onChange={updateField("email")}
            placeholder="ada@example.com"
            autoComplete="email"
          />
        </PatientField>

        <PatientField field="address" label="Address" error={fieldErrors.address}>
          <textarea
            name="address"
            value={values.address}
            onChange={updateField("address")}
            placeholder="1 Science Park"
            autoComplete="street-address"
            rows={2}
            maxLength={240}
          />
        </PatientField>

        {mode === "edit" ? (
          <PatientField field="status" label="Status" error={fieldErrors.status}>
            <select name="status" value={values.status} onChange={updateField("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </PatientField>
        ) : null}

        <button type="submit" disabled={isLoading}>
          {isLoading ? `${actionLabel}...` : actionLabel}
        </button>
      </form>

      <div className={`authStatus authStatus--${status}`} aria-live="polite">
        <p>{notice}</p>
        {details ? <p className="authStatusDetail">{details}</p> : null}
      </div>

      <div className="authFooter">
        <Link href="/patients" className="authSwitchLink">
          Back to roster
        </Link>
      </div>
    </section>
  );
}

type PatientFieldProps = {
  field: string;
  label: string;
  error?: string;
  children: ReactNode;
};

function PatientField({ field, label, error, children }: PatientFieldProps) {
  return (
    <label className={`patientField${error ? " patientField--invalid" : ""}`}>
      <span className="patientFieldLabel">{label}</span>
      {children}
      {error ? <span className="patientFieldError">{error}</span> : null}
    </label>
  );
}

function trimPayload(values: Record<string, string>): CreatePatientRequest {
  return {
    identifier: (values.identifier ?? "").trim(),
    givenName: (values.givenName ?? "").trim(),
    familyName: (values.familyName ?? "").trim(),
    birthDate: (values.birthDate ?? "").trim(),
    phone: (values.phone ?? "").trim(),
    email: (values.email ?? "").trim(),
    address: (values.address ?? "").trim(),
  };
}

function pickPatch(values: Record<string, string>): UpdatePatientRequest {
  const out: Record<string, string> = {};
  const KEYS: Array<keyof UpdatePatientRequest> = [
    "givenName",
    "familyName",
    "phone",
    "email",
    "address",
    "status",
  ];
  for (const key of KEYS) {
    const v = values[key];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed === "") continue;
    out[key] = trimmed;
  }
  return out as UpdatePatientRequest;
}
