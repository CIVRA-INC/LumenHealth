"use client";

import { useMemo } from "react";

type NoteType = "SOAP" | "FREE_TEXT" | "AI_SUMMARY" | "CORRECTION";

export type ClinicalNoteItem = {
  id: string;
  encounterId: string;
  authorId: string;
  type: NoteType;
  content: string;
  timestamp: string;
  correctionOfNoteId?: string;
};

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const NotesFeed = ({ notes }: { notes: ClinicalNoteItem[] }) => {
  const correctedMap = useMemo(() => {
    const map = new Map<string, string>();
    notes.forEach((note) => {
      if (note.type === "CORRECTION" && note.correctionOfNoteId) {
        map.set(note.correctionOfNoteId, note.id);
      }
    });
    return map;
  }, [notes]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Chronological Notes Feed</h2>

      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => {
            const wasCorrected = correctedMap.has(note.id);
            const isCorrection = note.type === "CORRECTION";

            return (
              <li
                key={note.id}
                className={`rounded-lg border p-3 ${
                  isCorrection
                    ? "border-amber-300 bg-amber-50"
                    : wasCorrected
                      ? "border-slate-300 bg-slate-100"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                      {note.authorId}
                    </span>
                    <span className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {note.type}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{formatTimestamp(note.timestamp)}</span>
                </div>

                {isCorrection && note.correctionOfNoteId ? (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Correction linked to note #{note.correctionOfNoteId}
                  </p>
                ) : null}

                <pre
                  className={`mt-3 whitespace-pre-wrap text-sm ${
                    wasCorrected ? "text-slate-500 line-through" : "text-slate-800"
                  }`}
                >
                  {note.content}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
