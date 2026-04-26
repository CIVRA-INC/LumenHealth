"use client";

interface Props {
  message?: string;
}

export function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <span className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export function EmptyState({ message = "Nothing here yet." }: Props) {
  return (
    <div role="status" className="flex flex-col items-center justify-center min-h-[40vh] gap-2 text-center px-4">
      <span className="text-4xl" aria-hidden>📭</span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function OfflineState() {
  return (
    <div role="alert" className="flex flex-col items-center justify-center min-h-[40vh] gap-2 text-center px-4">
      <span className="text-4xl" aria-hidden>📡</span>
      <p className="font-medium">You're offline</p>
      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong." }: Props) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center min-h-[40vh] gap-2 text-center px-4">
      <span className="text-4xl" aria-hidden>⚠️</span>
      <p className="font-medium">Error</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <button onClick={() => window.location.reload()} className="mt-2 text-sm underline">
        Retry
      </button>
    </div>
  );
}
