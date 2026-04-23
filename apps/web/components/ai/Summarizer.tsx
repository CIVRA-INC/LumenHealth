"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { isFeatureEnabled } from "@/lib/runtime-config";

type Props = {
  encounterId: string;
};

const parseSseBlock = (block: string): { event: string; payload: unknown } | null => {
  const lines = block.split("\n");
  let eventName = "message";
  const dataLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) {
      continue;
    }

    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const dataText = dataLines.join("\n");
  try {
    return { event: eventName, payload: JSON.parse(dataText) };
  } catch {
    return { event: eventName, payload: dataText };
  }
};

export const Summarizer = ({ encounterId }: Props) => {
  const aiEnabled = isFeatureEnabled("aiSummaries");
  const [content, setContent] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "draft">("idle");

  const canApprove = useMemo(
    () =>
      aiEnabled &&
      !isGenerating &&
      !isSaving &&
      mode === "draft" &&
      content.trim().length > 0 &&
      !!draftId,
    [aiEnabled, content, draftId, isGenerating, isSaving, mode],
  );

  useEffect(() => {
    if (!aiEnabled) {
      return;
    }

    const loadDraft = async () => {
      try {
        const response = await apiFetch(`/ai/drafts?encounterId=${encodeURIComponent(encounterId)}`);
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          data?: Array<{ id: string; content: string }>;
        };
        const existingDraft = payload.data?.[0];
        if (!existingDraft) {
          return;
        }

        setDraftId(existingDraft.id);
        setContent(existingDraft.content);
        setMode("draft");
      } catch {
        // Ignore draft bootstrap failures.
      }
    };

    void loadDraft();
  }, [aiEnabled, encounterId]);

  if (!aiEnabled) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">AI Summary</h2>
        <p className="mt-2 text-sm text-slate-600">
          AI summarization is currently disabled by runtime configuration.
        </p>
      </section>
    );
  }

  const startGeneration = async (useDummyStream = false) => {
    if (isGenerating || isSaving) {
      return;
    }

    setError(null);
    setFeedback(null);
    setMode("idle");
    setDraftId(null);
    setContent("");
    setIsGenerating(true);

    let built = "";

    try {
      const path = useDummyStream
        ? `/ai/stream-dummy?encounterId=${encodeURIComponent(encounterId)}`
        : `/ai/stream-summary?encounterId=${encodeURIComponent(encounterId)}`;

      const response = await apiFetch(path);
      if (!response.ok || !response.body) {
        throw new Error("Unable to start AI stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const parsed = parseSseBlock(block);
          if (!parsed) {
            continue;
          }

          const payload = parsed.payload as { chunk?: string };
          if (typeof payload?.chunk === "string" && payload.chunk.length > 0) {
            built = built.length > 0 ? `${built} ${payload.chunk}` : payload.chunk;
            setContent(built);
          }
        }
      }

      const finalContent = built.trim();
      if (!finalContent) {
        throw new Error("AI stream returned empty content.");
      }

      const draftResponse = await apiFetch("/ai/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId,
          content: finalContent,
        }),
      });

      if (!draftResponse.ok) {
        throw new Error("Failed to create AI draft.");
      }

      const draftPayload = (await draftResponse.json()) as { data?: { id?: string } };
      const createdDraftId = draftPayload.data?.id;
      if (!createdDraftId) {
        throw new Error("Invalid AI draft response.");
      }

      setDraftId(createdDraftId);
      setMode("draft");
      setFeedback("AI draft generated. Review and edit before approving.");
    } catch (err) {
      setError((err as Error).message || "AI generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const discardSummary = async () => {
    setError(null);
    setFeedback(null);
    if (!draftId) {
      setContent("");
      setMode("idle");
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch(`/ai/drafts/${encodeURIComponent(draftId)}`, { method: "DELETE" });
      setDraftId(null);
      setContent("");
      setMode("idle");
      setFeedback("Draft discarded.");
    } catch {
      setError("Failed to discard draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const approveSummary = async () => {
    if (!canApprove || !draftId) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsSaving(true);

    try {
      await apiFetch(`/ai/drafts/${encodeURIComponent(draftId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      const response = await apiFetch(`/ai/drafts/${encodeURIComponent(draftId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve draft.");
      }

      setFeedback("Approved and saved to clinical record.");
      setDraftId(null);
      setContent("");
      setMode("idle");
    } catch (err) {
      setError((err as Error).message || "Approval failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI Visit Summary (Draft)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Generate, review, edit, and approve before saving to immutable record.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            data-primary-action="true"
            disabled={isGenerating || isSaving}
            onClick={() => void startGeneration(false)}
            className="rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
          >
            {isGenerating ? "Generating..." : "Generate with Gemini"}
          </button>
          <button
            type="button"
            disabled={isGenerating || isSaving}
            onClick={() => void startGeneration(true)}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Dummy Stream
          </button>
        </div>
      </header>

      <div
        className={`mt-4 rounded-lg border p-3 transition-colors ${
          isGenerating
            ? "border-indigo-400 bg-indigo-50 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        {isGenerating ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            * AI Generating...
          </p>
        ) : null}

        {mode === "draft" ? (
          <p className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
            AI-Generated Draft. Please review and edit for medical accuracy.
          </p>
        ) : null}

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={isGenerating}
          placeholder="AI draft appears here..."
          className="h-56 w-full resize-y rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        />
      </div>

      {!isGenerating && mode === "draft" ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void discardSummary()}
            disabled={isSaving}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Discard Summary
          </button>
          <button
            type="button"
            data-primary-action="true"
            onClick={() => void approveSummary()}
            disabled={!canApprove}
            className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
          >
            Approve & Save to Record
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {feedback ? (
        <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedback}
        </p>
      ) : null}
    </section>
  );
};
