import { X } from 'lucide-react';
import {
  AlertDialog,
  Dialog as RadixDialog,
  DropdownMenu as RadixMenu,
  Popover as RadixPopover,
  Tooltip as RadixTooltip,
} from 'radix-ui';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../cn';
import { Button, IconButton } from './button';

const backdrop = 'fixed inset-0 z-40 bg-green-950/45 data-[state=open]:animate-fade-in';

// ── Dialog ───────────────────────────────────────────────────────────────────

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
/** Raw dialog parts, for bespoke overlays such as the command palette. */
export const DialogPrimitive = RadixDialog;

/** A modal for one focused task: title, optional description, body, and a footer for its actions. */
export function DialogContent({
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={backdrop} />
      <RadixDialog.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
          'rounded-xl border border-rule bg-surface shadow-pop data-[state=open]:animate-pop-in',
          width,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-3.5">
          <div>
            <RadixDialog.Title className="text-md font-semibold text-ink-950">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Description
              className={cn('mt-0.5 text-sm text-ink-500', !description && 'sr-only')}
            >
              {description ?? title}
            </RadixDialog.Description>
          </div>
          <RadixDialog.Close asChild>
            <IconButton label="Close" size="sm">
              <X />
            </IconButton>
          </RadixDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-rule px-5 py-3">
            {footer}
          </div>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

// ── Confirmation for consequential actions ───────────────────────────────────

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  children,
  requireAcknowledgement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'destructive';
  loading?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
  /** When set, the action stays disabled until the user ticks this statement. */
  requireAcknowledgement?: string;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setAcknowledged(false);
        onOpenChange(next);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={backdrop} />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-rule bg-surface p-5 shadow-pop data-[state=open]:animate-pop-in">
          <AlertDialog.Title className="text-md font-semibold text-ink-950">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-1.5 text-sm text-ink-600">{description}</div>
          </AlertDialog.Description>
          {children && <div className="mt-4">{children}</div>}
          {requireAcknowledgement && (
            <label className="mt-4 flex items-start gap-2.5 rounded-md border border-rule bg-sunken p-3 text-sm text-ink-900">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-green-700"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>{requireAcknowledgement}</span>
            </label>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button>{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <Button
              variant={tone === 'destructive' ? 'destructive' : 'primary'}
              loading={loading}
              disabled={!!requireAcknowledgement && !acknowledged}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

// ── Drawer ───────────────────────────────────────────────────────────────────

/** A panel that slides in from an edge: secondary tasks that keep the page visible, and mobile navigation. */
export function Drawer({
  open,
  onOpenChange,
  title,
  side = 'right',
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: 'left' | 'right';
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={backdrop} />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 z-50 flex w-[min(92vw,420px)] flex-col bg-surface shadow-pop',
            side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0 animate-slide-in-left',
            className,
          )}
        >
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

export const TooltipProvider = RadixTooltip.Provider;

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <RadixTooltip.Root delayDuration={300}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-md bg-green-950 px-2 py-1 text-xs font-medium text-white shadow-md data-[state=delayed-open]:animate-fade-in"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

// ── Popover ──────────────────────────────────────────────────────────────────

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export function PopoverContent({
  className,
  align = 'end',
  ...props
}: ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        align={align}
        sideOffset={8}
        className={cn(
          'z-50 w-80 rounded-xl border border-rule bg-surface shadow-pop data-[state=open]:animate-pop-in',
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}

// ── Dropdown menu ────────────────────────────────────────────────────────────

export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;

export function DropdownMenuContent({
  className,
  align = 'end',
  ...props
}: ComponentProps<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-52 rounded-lg border border-rule bg-surface p-1 shadow-pop data-[state=open]:animate-pop-in',
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone,
  ...props
}: ComponentProps<typeof RadixMenu.Item> & { tone?: 'danger' }) {
  return (
    <RadixMenu.Item
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-base outline-none select-none',
        'data-[disabled]:opacity-50 data-[highlighted]:bg-lime-100 [&_svg]:size-4 [&_svg]:text-ink-500',
        tone === 'danger' ? 'text-danger-700' : 'text-ink-900',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof RadixMenu.Label>) {
  return (
    <RadixMenu.Label
      className={cn('px-2.5 py-1.5 text-xs font-medium text-ink-500', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof RadixMenu.Separator>) {
  return <RadixMenu.Separator className={cn('my-1 h-px bg-rule', className)} {...props} />;
}
