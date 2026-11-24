import { Toaster as Sonner, toast } from 'sonner';

export { toast };

/** Mount once near the app root. Toasts confirm outcomes; failures should also be shown inline. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            '!rounded-lg !border !border-rule !bg-surface !text-ink-950 !shadow-pop !font-sans !text-base',
          description: '!text-ink-500',
        },
      }}
    />
  );
}
