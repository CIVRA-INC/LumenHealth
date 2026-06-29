"use client";

import { useState } from "react";

type ChartFormData = {
  patientId: string;
  date: string;
  encounterType: string;
  provider: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  height: number;
  notes: string;
};

const initialForm: ChartFormData = {
  patientId: "", date: "", encounterType: "checkup", provider: "", systolic: 0, diastolic: 0,
  heartRate: 0, temperature: 0, weight: 0, height: 0, notes: "",
};

function validateForm(data: ChartFormData): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!data.patientId.trim()) errs.patientId = "Patient ID is required";
  if (!data.date) errs.date = "Date is required";
  if (data.systolic < 60 || data.systolic > 250) errs.systolic = "Systolic must be 60-250";
  if (data.diastolic < 30 || data.diastolic > 150) errs.diastolic = "Diastolic must be 30-150";
  if (data.heartRate < 30 || data.heartRate > 250) errs.heartRate = "Heart rate must be 30-250";
  if (data.weight < 20 || data.weight > 300) errs.weight = "Weight must be 20-300 kg";
  return errs;
}

function formatVitals(data: ChartFormData): string {
  return `BP ${data.systolic}/${data.diastolic} | HR ${data.heartRate} | WT ${data.weight}kg | HT ${data.height}cm`;
}

function ChartTimelineForm({ onSubmit }: { onSubmit: (d: ChartFormData) => Promise<{ ok: boolean }> }) {
  const [form, setForm] = useState<ChartFormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function update(f: keyof ChartFormData, v: string | number) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateForm(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try { await onSubmit(form); setDone(true); }
    finally { setSaving(false); }
  }

  if (done) return <div data-testid="success">Chart entry saved</div>;

  return (
    <form onSubmit={handleSubmit} data-testid="chart-form">
      <label>Patient ID <input data-testid="patientId" value={form.patientId} onChange={(e) => update("patientId", e.target.value)} /></label>
      <label>Date <input type="date" data-testid="date" value={form.date} onChange={(e) => update("date", e.target.value)} /></label>
      <label>Encounter
        <select data-testid="encounterType" value={form.encounterType} onChange={(e) => update("encounterType", e.target.value)}>
          <option value="checkup">Checkup</option><option value="follow-up">Follow-up</option>
          <option value="emergency">Emergency</option>
        </select>
      </label>
      <fieldset><legend>Vitals</legend>
        {(["systolic", "diastolic", "heartRate", "temperature", "weight", "height"] as const).map((f) => (
          <label key={f}>{f} <input type="number" data-testid={f} value={form[f] || ""} onChange={(e) => update(f, Number(e.target.value))} /></label>
        ))}
      </fieldset>
      <label>Notes <textarea data-testid="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} /></label>
      {Object.values(errors).filter(Boolean).length > 0 && (
        <ul>{Object.entries(errors).filter(([_, v]) => v).map(([k, v]) => <li key={k} data-testid={`err-${k}`}>{v}</li>)}</ul>
      )}
      <button type="submit" data-testid="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
    </form>
  );
}

export { ChartTimelineForm, validateForm, formatVitals, initialForm, type ChartFormData };
