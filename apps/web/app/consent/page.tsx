"use client";
import { useState } from "react";

type ConsentType = "data-sharing" | "marketing" | "research" | "third-party" | "emergency-contact";
type Step = "select-type" | "configure" | "review" | "done";

const consentTypes: { value: ConsentType; label: string }[] = [
  { value: "data-sharing", label: "Data Sharing (share records with providers)" },
  { value: "marketing", label: "Marketing (receive promotional info)" },
  { value: "research", label: "Research (anonymized data for studies)" },
  { value: "third-party", label: "Third Party (share with partners)" },
  { value: "emergency-contact", label: "Emergency Contact (release info in emergency)" },
];

export default function ConsentPage() {
  const [step, setStep] = useState<Step>("select-type");
  const [consentType, setConsentType] = useState<ConsentType | "">("");
  const [scope, setScope] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  function validate(): string[] {
    const e: string[] = [];
    if (!consentType) e.push("Select a consent type");
    if (!scope.trim()) e.push("Describe the scope of consent");
    return e;
  }

  function handleNext() {
    const e = validate();
    setErrors(e);
    if (e.length) return;
    if (step === "select-type") setStep("configure");
    else if (step === "configure") setStep("review");
  }

  function handleBack() {
    if (step === "configure") setStep("select-type");
    if (step === "review") setStep("configure");
  }

  function handleConfirm() {
    const e = validate();
    setErrors(e);
    if (e.length) return;
    setDone(true);
  }

  if (done) {
    return (
      <main>
        <h1>Consent Granted</h1>
        <p>Consent for <strong>{consentType}</strong> has been recorded.</p>
        <button onClick={() => { setStep("select-type"); setConsentType(""); setScope(""); setExpiresAt(""); setDone(false); }}>Grant Another</button>
      </main>
    );
  }

  return (
    <main>
      <h1>Consent & Privacy</h1>
      <nav>{["Select Type", "Configure", "Review"].join(" > ")}</nav>

      {errors.length > 0 && <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}

      {step === "select-type" && (
        <section>
          <h2>Consent Type</h2>
          {consentTypes.map((ct) => (
            <label key={ct.value}>
              <input type="radio" name="consentType" value={ct.value} checked={consentType === ct.value} onChange={() => setConsentType(ct.value)} />
              {ct.label}
            </label>
          ))}
        </section>
      )}

      {step === "configure" && (
        <section>
          <h2>Configure Consent</h2>
          <label>Scope <textarea value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Describe what data is shared and with whom" /></label>
          <label>Expires <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label>
        </section>
      )}

      {step === "review" && (
        <section>
          <h2>Review</h2>
          <dl>
            <dt>Type</dt><dd>{consentType}</dd>
            <dt>Scope</dt><dd>{scope}</dd>
            <dt>Expires</dt><dd>{expiresAt || "No expiry"}</dd>
          </dl>
        </section>
      )}

      <div>
        {step !== "select-type" && <button onClick={handleBack}>Back</button>}
        {step !== "review" && <button onClick={handleNext}>Next</button>}
        {step === "review" && <button onClick={handleConfirm}>Confirm & Grant</button>}
      </div>
    </main>
  );
}
