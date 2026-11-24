import { cva, type VariantProps } from 'class-variance-authority';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';
import { Button } from './button';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const dot: Record<Tone, string> = {
  neutral: 'bg-ink-300',
  info: 'bg-green-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  danger: 'bg-danger-600',
};
const text: Record<Tone, string> = {
  neutral: 'text-ink-600',
  info: 'text-green-700',
  success: 'text-success-700',
  warning: 'text-warning-700',
  danger: 'text-danger-700',
};

/**
 * A status as a marker and a word: the marker is a dot, or a hollow ring for work still to happen.
 * No pill, no fill. Colour never carries the meaning alone because the label is always present.
 */
export function StatusIndicator({
  tone = 'neutral',
  pending,
  children,
  className,
}: {
  tone?: Tone;
  /** Hollow marker: the state is not reached yet. */ pending?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap',
        text[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          pending ? 'border border-current bg-transparent' : dot[tone],
        )}
      />
      {children}
    </span>
  );
}

const tag = cva(
  'inline-flex items-center rounded-xs px-1.5 py-px text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-ink-100 text-ink-700',
        info: 'bg-green-50 text-green-700',
        success: 'bg-success-50 text-success-700',
        warning: 'bg-warning-50 text-warning-700',
        danger: 'bg-danger-50 text-danger-700',
        inverse: 'bg-ink-900 text-white',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

/** A compact label for a category of record (e.g. "Walk-in", "Urgent"), not for a state. */
export function Tag({
  className,
  tone,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof tag>) {
  return <span className={cn(tag({ tone }), className)} {...props} />;
}

const noticeStyles: Record<
  Exclude<Tone, 'neutral'>,
  { box: string; icon: LucideIcon; iconColour: string }
> = {
  info: { box: 'border-l-green-600 bg-green-50/70', icon: Info, iconColour: 'text-green-700' },
  success: {
    box: 'border-l-success-600 bg-success-50/70',
    icon: CheckCircle2,
    iconColour: 'text-success-600',
  },
  warning: {
    box: 'border-l-warning-600 bg-warning-50/80',
    icon: AlertTriangle,
    iconColour: 'text-warning-600',
  },
  danger: {
    box: 'border-l-danger-600 bg-danger-50/70',
    icon: AlertCircle,
    iconColour: 'text-danger-600',
  },
};

/** A condition on the current page: a tinted strip with a coloured rule. Warnings and errors are announced. */
export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: Exclude<Tone, 'neutral'>;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon, iconColour } = noticeStyles[tone];
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-md border border-l-[3px] border-rule px-3.5 py-3',
        box,
        className,
      )}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', iconColour)} />
      <div className="min-w-0 flex-1 text-sm text-ink-800">
        {title && <p className="font-semibold text-ink-950">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-ink-700')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div aria-hidden className={cn('animate-pulse rounded-sm bg-ink-100', className)} {...props} />
  );
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn('size-4 animate-spin text-ink-400', className)}
    />
  );
}

/** Nothing to show: say what will appear here and, where useful, offer the next step. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start px-5 py-10 sm:items-center sm:text-center',
        className,
      )}
    >
      <p className="text-md font-semibold text-ink-950">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start px-5 py-10 sm:items-center sm:text-center',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-md font-semibold text-ink-950">
        <span aria-hidden className="size-2 rounded-full bg-danger-600" />
        {title}
      </p>
      {message && <p className="mt-1 max-w-md text-sm text-ink-500">{message}</p>}
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
