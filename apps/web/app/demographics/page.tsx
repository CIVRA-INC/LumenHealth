"use client";

import { useState } from "react";

type Step = "personal" | "address" | "emergency" | "review";

type FormData = {
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

const initialForm: FormData = {
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  bloodGroup: "",
  occupation: "",
  nationality: "",
  primaryLanguage: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "NG",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyEmail: "",
};

const genderOptions = ["male", "female", "other", "prefer-not-to-say"];
const bloodOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const stepLabels: Record<Step, string> = {
  personal: "Personal Info",
  address: "Address",
  emergency: "Emergency Contact",
  review: "Review & Submit",
};

const steps: Step[] = ["personal", "address", "emergency", "review"];

function idx(s: Step): number {
  return steps.indexOf(s);
}

function getNext(s: Step): Step | null {
  const i = idx(s);
  return i < steps.length - 1 ? steps[i + 1] : null;
}

function getPrev(s: Step): Step | null {
  const i = idx(s);
  return i > 0 ? steps[i - 1] : null;
}

function validateStep(step: Step, data: FormData): string[] {
  const errs: string[] = [];
  if (step === "personal") {
    if (!data.dateOfBirth) errs.push("Date of birth is required");
    if (!data.gender) errs.push("Gender is required");
  }
  if (step === "address") {
    if (!data.street.trim()) errs.push("Street is required");
    if (!data.city.trim()) errs.push("City is required");
  }
  if (step === "emergency") {
    if (!data.emergencyName.trim()) errs.push("Emergency contact name is required");
    if (!data.emergencyPhone.trim()) errs.push("Emergency phone is required");
  }
  return errs;
}

export default function DemographicsPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [step, setStep] = useState<Step>("personal");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  }

  function handleNext() {
    const errs = validateStep(step, form);
    if (errs.length) { setErrors(errs); return; }
    const next = getNext(step);
    if (next) setStep(next);
  }

  function handlePrev() {
    const prev = getPrev(step);
    if (prev) setStep(prev);
  }

  function handleSubmit() {
    const errs = validateStep("review", form);
    if (errs.length) { setErrors(errs); return; }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main>
        <h1>Demographics Submitted</h1>
        <p>Patient demographics record has been captured.</p>
        <button onClick={() => { setForm(initialForm); setStep("personal"); setSubmitted(false); }}>Add Another</button>
      </main>
    );
  }

  return (
    <main>
      <h1>Patient Demographics</h1>
      <nav aria-label="Progress">
        {steps.map((s) => (
          <span key={s} data-active={s === step}>{stepLabels[s]}</span>
        ))}
      </nav>

      {errors.length > 0 && (
        <ul aria-label="Errors">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {step === "personal" && (
        <section>
          <label>Date of Birth <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} /></label>
          <label>Gender <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
            <option value="">Select</option>
            {genderOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select></label>
          <label>Marital Status <input value={form.maritalStatus} onChange={(e) => update("maritalStatus", e.target.value)} /></label>
          <label>Blood Group <select value={form.bloodGroup} onChange={(e) => update("bloodGroup", e.target.value)}>
            <option value="">Select</option>
            {bloodOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select></label>
          <label>Occupation <input value={form.occupation} onChange={(e) => update("occupation", e.target.value)} /></label>
          <label>Nationality <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} /></label>
          <label>Primary Language <input value={form.primaryLanguage} onChange={(e) => update("primaryLanguage", e.target.value)} /></label>
        </section>
      )}

      {step === "address" && (
        <section>
          <label>Street <input value={form.street} onChange={(e) => update("street", e.target.value)} /></label>
          <label>City <input value={form.city} onChange={(e) => update("city", e.target.value)} /></label>
          <label>State <input value={form.state} onChange={(e) => update("state", e.target.value)} /></label>
          <label>Postal Code <input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></label>
          <label>Country <input value={form.country} onChange={(e) => update("country", e.target.value)} /></label>
        </section>
      )}

      {step === "emergency" && (
        <section>
          <label>Contact Name <input value={form.emergencyName} onChange={(e) => update("emergencyName", e.target.value)} /></label>
          <label>Relationship <input value={form.emergencyRelationship} onChange={(e) => update("emergencyRelationship", e.target.value)} /></label>
          <label>Phone <input value={form.emergencyPhone} onChange={(e) => update("emergencyPhone", e.target.value)} /></label>
          <label>Email <input type="email" value={form.emergencyEmail} onChange={(e) => update("emergencyEmail", e.target.value)} /></label>
        </section>
      )}

      {step === "review" && (
        <section>
          <h2>Review Demographics</h2>
          <dl>
            <dt>DOB</dt><dd>{form.dateOfBirth}</dd>
            <dt>Gender</dt><dd>{form.gender}</dd>
            <dt>Address</dt><dd>{form.street}, {form.city}, {form.state}</dd>
            <dt>Emergency</dt><dd>{form.emergencyName} ({form.emergencyPhone})</dd>
          </dl>
        </section>
      )}

      <div>
        {step !== "personal" && <button onClick={handlePrev}>Back</button>}
        {step !== "review" && <button onClick={handleNext}>Next</button>}
        {step === "review" && <button onClick={handleSubmit}>Submit</button>}
      </div>
    </main>
  );
}
