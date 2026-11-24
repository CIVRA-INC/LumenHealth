import type { ReactNode } from 'react';

/**
 * One part of the encounter record. The sections are stacked on a single white sheet and separated by
 * hairlines, so the encounter reads as one continuous clinical document. Titles are set in the display
 * face, like headings in a printed record; the working controls stay in the interface face.
 */
export function EncounterSection({
  id,
  title,
  meta,
  action,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-40 border-t border-rule px-5 py-6 first:border-t-0 sm:px-7"
    >
      <div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="display text-lg text-ink-950">
          {title}
          {meta && (
            <span className="ml-3 font-sans text-sm font-normal tracking-normal text-ink-500">
              {meta}
            </span>
          )}
        </h2>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}
