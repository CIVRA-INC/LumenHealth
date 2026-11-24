import { Button, ConfirmDialog } from '@lumen/ui';
import { useEffect, type ReactNode } from 'react';
import { useBlocker, useNavigate } from 'react-router';

/**
 * The frame around a patient form: a sticky action bar, and a guard that stops entered data being
 * lost by accident (leaving the page, closing the tab).
 */
export function PatientFormShell({
  dirty,
  savedRef,
  saving,
  submitLabel,
  cancelTo,
  onSubmit,
  children,
}: {
  /** True while there are unsaved entries. */
  dirty: boolean;
  /** Set to true right before navigating away after a successful save, so the guard stays quiet. */
  savedRef: { current: boolean };
  saving: boolean;
  submitLabel: string;
  cancelTo: string;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !savedRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center justify-between gap-3 border-t border-rule-strong bg-stone/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <p className="hidden text-xs text-ink-500 sm:block">
          <span className="text-danger-600">*</span> required
        </p>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => navigate(cancelTo)}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.state === 'blocked' && blocker.reset()}
        title="Discard these changes?"
        description="What you have entered has not been saved."
        confirmLabel="Discard"
        tone="destructive"
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      />
    </form>
  );
}
