"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

const RESET_AFTER_MS = 2000;

/** Last resort for browsers without the async clipboard API (or when it is denied). */
function copyWithTextarea(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

/**
 * Copies `value` to the clipboard. `label` names what is copied for assistive tech
 * ("Copy recorded hash"); success and failure are announced in a polite live region and clear
 * themselves after two seconds.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
    } catch {
      copied = copyWithTextarea(value);
    }

    setState(copied ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), RESET_AFTER_MS);
  }, [value]);

  return (
    <span className="copyControl">
      <button type="button" className="copyButton secondary" onClick={copy} aria-label={label}>
        Copy
      </button>
      <span className="muted" role="status" aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Could not copy — select the text and copy it manually." : ""}
      </span>
    </span>
  );
}
