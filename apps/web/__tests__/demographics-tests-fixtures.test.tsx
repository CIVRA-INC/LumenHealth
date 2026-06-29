"use client";
import { useState } from "react";

type DemographicsForm = {
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  occupation: string;
  nationality: string;
  primaryLanguage: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
};

const initialForm: DemographicsForm = {
  dateOfBirth: "", gender: "", maritalStatus: "", bloodGroup: "", occupation: "",
  nationality: "", primaryLanguage: "", street: "", city: "", state: "",
  postalCode: "", country: "NG", emergencyName: "", emergencyRelationship: "",
  emergencyPhone: "", emergencyEmail: "",
};

const genderOptions = ["male", "female", "other", "prefer-not-to-say"];
const bloodOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const maritalOptions = ["single", "married", "divorced", "widowed"];

type ErrorMap = Partial<Record<keyof DemographicsForm, string>>;

function validateForm(data: DemographicsForm): ErrorMap {
  const e: ErrorMap = {};
  if (!data.dateOfBirth) e.dateOfBirth = "Required";
  if (!data.gender) e.gender = "Required";
  if (!data.street.trim()) e.street = "Required";
  if (!data.city.trim()) e.city = "Required";
  if (!data.emergencyName.trim()) e.emergencyName = "Required";
  if (!data.emergencyPhone.trim()) e.emergencyPhone = "Required";
  return e;
}

function toPayload(data: DemographicsForm): Record<string, unknown> {
  return {
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    maritalStatus: data.maritalStatus || undefined,
    bloodGroup: data.bloodGroup || undefined,
    occupation: data.occupation || undefined,
    nationality: data.nationality || undefined,
    primaryLanguage: data.primaryLanguage || undefined,
    address: { street: data.street, city: data.city, state: data.state, postalCode: data.postalCode, country: data.country },
    emergencyContact: { name: data.emergencyName, relationship: data.emergencyRelationship, phone: data.emergencyPhone, email: data.emergencyEmail || undefined },
  };
}

function DemographicsFormComponent({
  onSubmit,
}: {
  onSubmit: (payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
}) {
  const [form, setForm] = useState<DemographicsForm>(initialForm);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(f: keyof DemographicsForm, v: string) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateForm(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      await onSubmit(toPayload(form));
      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  }

  if (submitted) return <div data-testid="success">Demographics saved</div>;

  return (
    <form onSubmit={handleSubmit} data-testid="demographics-form">
      {(["dateOfBirth", "gender", "maritalStatus", "bloodGroup", "occupation", "nationality", "primaryLanguage"] as const).map((f) => (
        <div key={f}>
          <label htmlFor={f}>{f}</label>
          {f === "gender" ? (
            <select id={f} value={form[f]} onChange={(e) => update(f, e.target.value)} data-testid={f}>
              <option value="">Select</option>
              {genderOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f === "maritalStatus" ? (
            <select id={f} value={form[f]} onChange={(e) => update(f, e.target.value)} data-testid={f}>
              <option value="">Select</option>
              {maritalOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f === "bloodGroup" ? (
            <select id={f} value={form[f]} onChange={(e) => update(f, e.target.value)} data-testid={f}>
              <option value="">Select</option>
              {bloodOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input id={f} type={f === "dateOfBirth" ? "date" : "text"} value={form[f]} onChange={(e) => update(f, e.target.value)} data-testid={f} />
          )}
          {errors[f] && <span data-testid={`err-${f}`}>{errors[f]}</span>}
        </div>
      ))}
      <fieldset>
        <legend>Address</legend>
        {(["street", "city", "state", "postalCode", "country"] as const).map((f) => (
          <div key={f}>
            <label htmlFor={f}>{f}</label>
            <input id={f} value={form[f]} onChange={(e) => update(f, e.target.value)} data-testid={f} />
            {errors[f] && <span data-testid={`err-${f}`}>{errors[f]}</span>}
          </div>
        ))}
      </fieldset>
      <fieldset>
        <legend>Emergency Contact</legend>
        {(["emergencyName", "emergencyRelationship", "emergencyPhone", "emergencyEmail"] as const).map((f) => (
          <div key={f}>
            <label htmlFor={f}>{f}</label>
            <input id={f} value={form[f]} onChange={(e) => update(f, e.target.value)} data-testid={f} />
            {errors[f] && <span data-testid={`err-${f}`}>{errors[f]}</span>}
          </div>
        ))}
      </fieldset>
      <button type="submit" disabled={saving} data-testid="submit">{saving ? "Saving..." : "Save Demographics"}</button>
    </form>
  );
}

export { DemographicsFormComponent, validateForm, toPayload, initialForm, type DemographicsForm };
