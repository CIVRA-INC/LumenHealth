import { useEffect, useState } from 'react';

/**
 * A search box whose value is committed to the URL after the user pauses typing. External changes to
 * the URL (back, forward, "clear search") flow back into the box; the box's own commits do not, so
 * characters typed while a commit is in flight are never overwritten.
 */
export function useSearchInput(urlValue: string, commit: (value: string) => void, delayMs = 250) {
  const [text, setText] = useState(urlValue);
  const [seen, setSeen] = useState(urlValue);
  const [pushed, setPushed] = useState(urlValue);

  if (urlValue !== seen) {
    setSeen(urlValue);
    if (urlValue !== pushed) {
      setText(urlValue);
      setPushed(urlValue);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = text.trim();
      if (next !== pushed.trim()) {
        setPushed(next);
        commit(next);
      }
    }, delayMs);
    return () => clearTimeout(timer);
    // `commit` is intentionally excluded: it changes identity with every URL update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delayMs]);

  return [text, setText] as const;
}
