import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

/**
 * One height scale for every control: sm 28, md 32, lg 40 (44 on touch screens). Buttons, text
 * fields and selects share it so they line up in any toolbar or form row.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none',
    'rounded-md transition-colors duration-100',
    'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      /**
       * primary      the one main action of a view (chartreuse fill, near-black text)
       * secondary    ordinary actions (white, thin border)
       * quiet        low-emphasis actions, no border until hovered
       * destructive  irreversible or risky actions (filled red)
       * destructive-quiet   the same, as text
       */
      variant: {
        primary: 'bg-lime-400 text-ink-950 hover:bg-lime-500 active:bg-lime-600',
        secondary:
          'border border-rule-strong bg-surface text-ink-900 hover:bg-sunken active:bg-stone-deep',
        quiet: 'text-ink-700 hover:bg-ink-950/5 active:bg-ink-950/10',
        destructive:
          'bg-danger-600 text-white hover:bg-danger-700 focus-visible:outline-danger-600',
        'destructive-quiet': 'text-danger-700 hover:bg-danger-50',
      },
      size: {
        sm: 'h-7 px-2.5 text-sm',
        md: 'h-8 px-3 text-base pointer-coarse:h-11',
        lg: 'h-10 px-4 text-md pointer-coarse:h-11',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends Omit<ComponentProps<'button'>, 'children'>, VariantProps<typeof buttonVariants> {
  /** Shows a spinner, keeps the width, and ignores clicks while work is in progress. */
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* The label stays in the layout while loading so the button does not change width. */}
      <span className={cn('inline-flex items-center gap-1.5', loading && 'opacity-0')}>
        {children}
      </span>
      {loading && <Loader2 aria-hidden className="absolute animate-spin" />}
    </button>
  );
}

const iconSizes = {
  sm: 'size-7',
  md: 'size-8 pointer-coarse:size-11',
  lg: 'size-10 pointer-coarse:size-11',
} as const;

export interface IconButtonProps
  extends
    Omit<ComponentProps<'button'>, 'children' | 'aria-label'>,
    Pick<VariantProps<typeof buttonVariants>, 'variant'> {
  /** Required: an icon-only control must have an accessible name. Also shown as a tooltip by the browser. */
  label: string;
  size?: keyof typeof iconSizes;
  children: ReactNode;
}

/** A square, icon-only button with a mandatory accessible label. */
export function IconButton({
  label,
  className,
  variant = 'quiet',
  size = 'md',
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(buttonVariants({ variant }), 'px-0', iconSizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
