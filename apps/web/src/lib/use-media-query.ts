import { useSyncExternalStore } from 'react';

/** Tracks a CSS media query (e.g. `(min-width: 1280px)`), updating when the window crosses it. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
