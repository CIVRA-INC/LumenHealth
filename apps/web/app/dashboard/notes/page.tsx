"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { NotesFeed, type ClinicalNoteItem } from "@/components/notes/NotesFeed";
import { SoapNoteEditor } from "@/components/notes/SoapNoteEditor";

const ENCOUNTER_ID = "mock-enc-123";

export default function NotesPage() {
  const [notes, setNotes] = useState<ClinicalNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/notes/encounter/${ENCOUNTER_ID}`);
      if (!response.ok) {
        throw new Error("Failed to load notes");
      }

      const payload = (await response.json()) as { data?: ClinicalNoteItem[] };
      setNotes(payload.data ?? []);
    } catch {
      setError("Unable to load notes feed.");
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, []);

  const appendNote = async (payload: {
    encounterId: string;
    type: "SOAP" | "FREE_TEXT" | "AI_SUMMARY" | "CORRECTION";
    content: string;
    correctionOfNoteId?: string;
  }) => {
    const optimistic: ClinicalNoteItem = {
      id: `temp-${Date.now()}`,
      encounterId: payload.encounterId,
      authorId: "You",
      type: payload.type,
      content: payload.content,
      timestamp: new Date().toISOString(),
      correctionOfNoteId: payload.correctionOfNoteId,
    };

    setNotes((current) => [...current, optimistic]);

    const response = await apiFetch("/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setNotes((current) => current.filter((note) => note.id !== optimistic.id));
      throw new Error("Failed to append note");
    }

    const result = (await response.json()) as { data?: ClinicalNoteItem };
    if (result.data) {
      setNotes((current) => [...current.filter((note) => note.id !== optimistic.id), result.data!]);
    }
  };

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Clinical Notes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Append-only SOAP notes with correction entries for immutable auditability.
        </p>
      </header>

      <SoapNoteEditor encounterId={ENCOUNTER_ID} isLocked={false} onSubmit={appendNote} />

      {isLoading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Loading notes...
        </section>
      ) : error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </section>
      ) : (
        <NotesFeed notes={notes} />
      )}
    </main>
  );
}
