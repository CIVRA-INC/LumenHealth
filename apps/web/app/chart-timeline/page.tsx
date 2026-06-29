"use client";

import { useState } from "react";

type Vitals = { systolic: number; diastolic: number; heartRate: number; temperature: number; weight: number };
type Step = "find-patient" | "add-vitals" | "review" | "done";
type Entry = { patientId: string; date: string; encounterType: string; vitals: Vitals; notes: string };

const initialEntry: Entry = { patientId: "", date: "", encounterType: "checkup", vitals: { systolic: 0, diastolic: 0, heartRate: 0, temperature: 0, weight: 0 }, notes: "" };

function validateVitals(v: Vitals): string[] {
  const e: string[] = [];
  if (v.systolic < 60 || v.systolic > 250) e.push("Systolic must be 60-250");
  if (v.diastolic < 30 || v.diastolic > 150) e.push("Diastolic must be 30-150");
  if (v.heartRate < 30 || v.heartRate > 250) e.push("Heart rate must be 30-250");
  if (v.weight < 20 || v.weight > 300) e.push("Weight must be 20-300 kg");
  return e;
}

function formatVitals(v: Vitals): string {
  return `BP: ${v.systolic}/${v.diastolic}, HR: ${v.heartRate}, Temp: ${v.temperature}°C, WT: ${v.weight}kg`;
}

export default function ChartTimelinePage() {
  const [step, setStep] = useState<Step>("find-patient");
  const [entry, setEntry] = useState<Entry>(initialEntry);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function next() {
    if (step === "add-vitals") {
      const errs = validateVitals(entry.vitals);
      setErrors(errs);
      if (errs.length) return;
    }
    if (step === "find-patient") { setStep("add-vitals"); return; }
    if (step === "add-vitals") { setStep("review"); return; }
    if (step === "review") { setSaved(true); return; }
  }

  function back() {
    if (step === "add-vitals") setStep("find-patient");
    if (step === "review") setStep("add-vitals");
  }

  function update(field: keyof Entry, value: string) {
    setEntry((p) => ({ ...p, [field]: value }));
    setErrors([]);
  }

  function updateVital(field: keyof Vitals, value: string) {
    setEntry((p) => ({ ...p, vitals: { ...p.vitals, [field]: Number(value) } }));
    setErrors([]);
  }

  if (saved) {
    return (
      <main>
        <h1>Chart Timeline</h1>
        <p>Entry saved for patient {entry.patientId}</p>
        <button onClick={() => { setEntry(initialEntry); setStep("find-patient"); setSaved(false); }}>Add Another</button>
      </main>
    );
  }

  return (
    <main>
      <h1>Chart Timeline</h1>
      <nav>Step: {["Patient", "Vitals", "Review"].join(" > ")}</nav>
      {errors.length > 0 && <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}

      {step === "find-patient" && (
        <section>
          <label>Patient ID <input value={entry.patientId} onChange={(e) => update("patientId", e.target.value)} /></label>
          <label>Date <input type="date" value={entry.date} onChange={(e) => update("date", e.target.value)} /></label>
          <label>Encounter Type
            <select value={entry.encounterType} onChange={(e) => update("encounterType", e.target.value)}>
              <option value="checkup">Checkup</option>
              <option value="follow-up">Follow-up</option>
              <option value="emergency">Emergency</option>
            </select>
          </label>
        </section>
      )}

      {step === "add-vitals" && (
        <section>
          {(["systolic", "diastolic", "heartRate", "temperature", "weight"] as const).map((f) => (
            <label key={f}>{f} <input type="number" value={entry.vitals[f] || ""} onChange={(e) => updateVital(f, e.target.value)} /></label>
          ))}
          <label>Notes <textarea value={entry.notes} onChange={(e) => update("notes", e.target.value)} /></label>
        </section>
      )}

      {step === "review" && (
        <section>
          <h2>Review</h2>
          <p>Patient: {entry.patientId} | Date: {entry.date} | Type: {entry.encounterType}</p>
          <p>Vitals: {formatVitals(entry.vitals)}</p>
          <p>Notes: {entry.notes || "—"}</p>
        </section>
      )}

      <div>
        {step !== "find-patient" && <button onClick={back}>Back</button>}
        <button onClick={next}>{step === "review" ? "Confirm" : "Next"}</button>
      </div>
    </main>
  );
}
