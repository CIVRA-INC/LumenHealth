"use client";

import { useState } from "react";

type UploadStep = "select-file" | "metadata" | "review";

type DocumentForm = {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: string;
  description: string;
  tags: string;
};

const initialForm: DocumentForm = {
  fileName: "",
  fileType: "",
  fileSizeBytes: 0,
  category: "",
  description: "",
  tags: "",
};

const categoryOptions = [
  { label: "Clinical", value: "clinical" },
  { label: "Administrative", value: "administrative" },
  { label: "Lab Report", value: "lab-report" },
  { label: "Imaging", value: "imaging" },
  { label: "Consent Form", value: "consent-form" },
  { label: "Other", value: "other" },
];

const stepLabels: Record<UploadStep, string> = {
  "select-file": "Select File",
  metadata: "Metadata",
  review: "Review & Upload",
};

const steps: UploadStep[] = ["select-file", "metadata", "review"];

function idx(s: UploadStep): number {
  return steps.indexOf(s);
}

function getNext(s: UploadStep): UploadStep | null {
  const i = idx(s);
  return i < steps.length - 1 ? steps[i + 1] : null;
}

function getPrev(s: UploadStep): UploadStep | null {
  const i = idx(s);
  return i > 0 ? steps[i - 1] : null;
}

function validateStep(step: UploadStep, data: DocumentForm): string[] {
  const errs: string[] = [];
  if (step === "select-file") {
    if (!data.fileName.trim()) errs.push("File name is required");
    if (!data.fileType.trim()) errs.push("File type is required");
    if (data.fileSizeBytes <= 0) errs.push("File size is required");
  }
  if (step === "metadata") {
    if (!data.category) errs.push("Category is required");
  }
  return errs;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [step, setStep] = useState<UploadStep>("select-file");
  const [errors, setErrors] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState(false);

  function update(field: keyof DocumentForm, value: string | number) {
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

  function handleUpload() {
    const errs = validateStep("review", form);
    if (errs.length) { setErrors(errs); return; }
    setUploaded(true);
  }

  if (uploaded) {
    return (
      <main>
        <h1>Document Uploaded</h1>
        <p>Document has been successfully uploaded to the patient records system.</p>
        <button onClick={() => { setForm(initialForm); setStep("select-file"); setUploaded(false); }}>
          Upload Another
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Documents & Attachments</h1>
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

      {step === "select-file" && (
        <section>
          <label>File Name <input value={form.fileName} onChange={(e) => update("fileName", e.target.value)} /></label>
          <label>File Type <input value={form.fileType} onChange={(e) => update("fileType", e.target.value)} placeholder="e.g. application/pdf" /></label>
          <label>File Size (bytes) <input type="number" value={form.fileSizeBytes || ""} onChange={(e) => update("fileSizeBytes", parseInt(e.target.value) || 0)} /></label>
        </section>
      )}

      {step === "metadata" && (
        <section>
          <label>Category <select value={form.category} onChange={(e) => update("category", e.target.value)}>
            <option value="">Select category</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select></label>
          <label>Description <textarea value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
          <label>Tags (comma-separated) <input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="e.g. lab, blood, routine" /></label>
        </section>
      )}

      {step === "review" && (
        <section>
          <h2>Review Document</h2>
          <dl>
            <dt>File</dt><dd>{form.fileName} ({form.fileType})</dd>
            <dt>Size</dt><dd>{formatFileSize(form.fileSizeBytes)}</dd>
            <dt>Category</dt><dd>{form.category}</dd>
            <dt>Description</dt><dd>{form.description || "—"}</dd>
            <dt>Tags</dt><dd>{form.tags || "—"}</dd>
          </dl>
        </section>
      )}

      <div>
        {step !== "select-file" && <button onClick={handlePrev}>Back</button>}
        {step !== "review" && <button onClick={handleNext}>Next</button>}
        {step === "review" && <button onClick={handleUpload}>Upload Document</button>}
      </div>
    </main>
  );
}
