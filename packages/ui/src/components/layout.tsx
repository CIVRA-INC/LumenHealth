import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

/** A white work surface with a thin rule. Use it for a self-contained region, not around every heading. */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section className={cn('rounded-lg border border-rule bg-surface', className)} {...props} />
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-12 items-center justify-between gap-4 border-b border-rule px-4 py-2.5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-950">{title}</h2>
        {description && <p className="text-xs text-ink-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function PanelBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-4', className)} {...props} />;
}

/**
 * The title block of a page: an optional eyebrow (a short mono label such as the date), the display-face
 * title, a quiet supporting line, and the page's actions on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  as: Title = 'h1',
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  return (
    <header className={cn('mb-6', className)}>
      {eyebrow && (
        <p className="data mb-1.5 text-xs tracking-wide text-ink-500 uppercase">{eyebrow}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <Title className="display min-w-0 text-2xl text-ink-950">{title}</Title>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="mt-1 max-w-prose text-base text-ink-600">{description}</p>}
    </header>
  );
}

/**
 * A titled region of a page, set off by a thin rule below the title. The default is a primary region;
 * `quiet` is for supporting regions beside it, so a page has a visible order of importance.
 */
export function SectionHeader({
  title,
  meta,
  action,
  quiet,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  quiet?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 border-b pb-2',
        quiet ? 'border-rule' : 'border-rule-strong',
        className,
      )}
    >
      <h2
        className={
          quiet ? 'text-base font-medium text-ink-800' : 'text-md font-semibold text-ink-950'
        }
      >
        {title}
        {meta != null && meta !== false && (
          <span className="data ml-2 text-sm font-normal text-ink-500">{meta}</span>
        )}
      </h2>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** Label and value pairs for a record view. */
export function DefinitionList({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-2.5 text-base', className)}>
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
          <dt className="text-sm text-ink-500">{item.label}</dt>
          <dd className="min-w-0 break-words text-ink-950">
            {item.value ?? <span className="text-ink-400">Not recorded</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A titled region of a record view: title in the left column, content in the right, a thin rule
 * between regions. The read-only counterpart of FormSection.
 */
export function RecordSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-x-12 gap-y-3 border-t border-rule py-6 first:border-t-0 first:pt-0 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h2 className="text-md font-semibold text-ink-950">{title}</h2>
        {description && <p className="mt-1 max-w-[30ch] text-sm text-ink-500">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .replace(/^(dr|nurse|mr|mrs|ms)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-lime-400 text-xs font-semibold text-ink-950',
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'data rounded-xs border border-rule-strong bg-surface px-1.5 py-px text-xs text-ink-500',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
