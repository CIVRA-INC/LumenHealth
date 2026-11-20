"use client";

import type { MouseEvent } from "react";

export const MAIN_CONTENT_ID = "main-content";

/**
 * First focusable element on every page. Activating it moves focus to the
 * page's `main` landmark (every `<main>` carries `id="main-content"` and
 * `tabIndex={-1}`), bypassing the blocks that come before it (WCAG 2.4.1).
 */
export function SkipLink() {
  const focusMain = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;
    event.preventDefault();
    main.focus();
  };

  return (
    <a href={`#${MAIN_CONTENT_ID}`} className="skipLink" onClick={focusMain}>
      Skip to main content
    </a>
  );
}
