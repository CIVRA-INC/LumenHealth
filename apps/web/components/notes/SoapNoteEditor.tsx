"use client";

import { FormEvent, useMemo, useState } from "react";

type NoteType = "SOAP" | "FREE_TEXT" | "AI_SUMMARY" | "CORRECTION";

type SubmitPayload = {
  encounterId: string;
  type: NoteType;
  content: string;
  correctionOfNoteId?: string;
};

type Props = {
  encounterId: string;
  isLocked: boolean;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
};

export const SoapNoteEditor = ({ encounterId, isLocked, onSubmit }: Props) => {
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [correctionFor, setCorrectionFor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return [subjective, objective, assessment, plan].some((part) => part.trim().length > 0);
  }, [assessment, objective, plan, subjective]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isLocked || !canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const content = [
      `## Subjective\n${subjective.trim() || "N/A"}`,
      `## Objective\n${objective.trim() || "N/A"}`,
      `## Assessment\n${assessment.trim() || "N/A"}`,
      `## Plan\n${plan.trim() || "N/A"}`,
    ].join("\n\n");

    const isCorrection = correctionFor.trim().length > 0;

    try {
      await onSubmit({
        encounterId,
        type: isCorrection ? "CORRECTION" : "SOAP",
        content,
        correctionOfNoteId: isCorrection ? correctionFor.trim() : undefined,
      });

      setSubjective("");
      setObjective("");
      setAssessment("");
      setPlan("");
      setCorrectionFor("");
    } catch {
      setError("Failed to save note. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "mt-1 h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">SOAP Note Editor</h2>
      <p className="mt-1 text-sm text-slate-600">
        Append-only note submission. Use correction mode to supersede a prior note.
      </p>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <label className="text-sm text-slate-700">
          Subjective
          <textarea
            className={inputClass}
            placeholder="Patient reported symptoms..."
            value={subjective}
            onChange={(event) => setSubjective(event.target.value)}
            disabled={isLocked}
          />
        </label>

        <label className="text-sm text-slate-700">
          Objective
          <textarea
            className={inputClass}
            placeholder="Exam/vitals findings..."
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            disabled={isLocked}
          />
        </label>

        <label className="text-sm text-slate-700">
          Assessment
          <textarea
            className={inputClass}
            placeholder="Clinical impression..."
            value={assessment}
            onChange={(event) => setAssessment(event.target.value)}
            disabled={isLocked}
          />
        </label>

        <label className="text-sm text-slate-700">
          Plan
          <textarea
            className={inputClass}
            placeholder="Treatment and follow-up plan..."
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            disabled={isLocked}
          />
        </label>

        <label className="text-sm text-slate-700">
          Correction Of Note ID (optional)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
            placeholder="Paste existing note id to publish CORRECTION"
            value={correctionFor}
            onChange={(event) => setCorrectionFor(event.target.value)}
            disabled={isLocked}
          />
        </label>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {correctionFor.trim()
              ? "Submitting as CORRECTION note"
              : "Submitting as SOAP note"}
          </p>

          <button
            type="submit"
            disabled={isLocked || isSubmitting || !canSubmit}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Saving..." : "Append Note"}
          </button>
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
};
