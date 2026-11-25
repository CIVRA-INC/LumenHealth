export function LogoMark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--color-lime-400)" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="var(--color-green-950)" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="2.6" fill="var(--color-green-950)" />
    </svg>
  );
}

/** The wordmark: set in the display face. `inverse` is for the dark navigation. */
export function Wordmark({ inverse }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`display text-lg ${inverse ? 'text-white' : 'text-ink-950'}`}>
        LumenHealth
      </span>
    </span>
  );
}
